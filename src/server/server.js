import express from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import QRCode from 'qrcode'
import sharp from 'sharp'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const UPLOAD_BASE_DIR =
  process.env.UPLOAD_BASE_DIR
    ? path.resolve(process.env.UPLOAD_BASE_DIR)
    : path.resolve(__dirname, '..', '..', 'public', 'uploads')
const UPLOAD_IMG_DIR = path.join(UPLOAD_BASE_DIR, 'img')
const UPLOAD_GIF_DIR = path.join(UPLOAD_BASE_DIR, 'gif')
const WATERMARK_FILE =
  process.env.WATERMARK_FILE_PATH
    ? path.resolve(process.env.WATERMARK_FILE_PATH)
    : path.resolve(__dirname, '..', '..', 'public', 'BytePlus.png')

const ensureDir = dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

ensureDir(UPLOAD_BASE_DIR)
ensureDir(UPLOAD_IMG_DIR)
ensureDir(UPLOAD_GIF_DIR)

if (!fs.existsSync(WATERMARK_FILE)) {
  console.warn(`[watermark] File not found at ${WATERMARK_FILE}. Uploaded photos will skip watermarking.`)
}

const app = express()
const PORT = process.env.PORT || 5000

const resolvePublicBaseUrl = req => {
  const configured = (process.env.PUBLIC_BASE_URL || '').trim()
  if (configured) {
    return configured.replace(/\/+$/, '')
  }
  return `${req.protocol}://${req.get('host')}`
}

app.use(express.json())
app.use(express.static(path.resolve(__dirname, '..', '..', 'dist')))

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
})

console.log(`[storage] Provider: local (hardcoded)`)

const shouldWatermarkMimetype = mimetype => {
  if (!mimetype) return true
  const normalized = String(mimetype).toLowerCase()
  return normalized.startsWith('image/') && normalized !== 'image/gif'
}

const applyWatermarkToBuffer = async (buffer, mimetype) => {
  const watermarkAvailable = fs.existsSync(WATERMARK_FILE)
  if (!watermarkAvailable) {
    return buffer
  }

  if (!buffer || buffer.length === 0) {
    return buffer
  }

  if (!shouldWatermarkMimetype(mimetype)) {
    return buffer
  }

  try {
    const imageMetadata = await sharp(buffer).metadata()
    if (!imageMetadata?.width || !imageMetadata?.height) {
      return buffer
    }

    const watermarkMetadata = await sharp(WATERMARK_FILE).metadata()
    if (!watermarkMetadata?.width || !watermarkMetadata?.height) {
      console.warn('[watermark] Unable to read watermark metadata; skipping.')
      return buffer
    }

    const targetWidth = Math.max(1, Math.round(imageMetadata.width * 0.2))
    const targetHeight = Math.max(
      1,
      Math.round(targetWidth * (watermarkMetadata.height / watermarkMetadata.width))
    )
    const margin = Math.max(10, Math.round(Math.min(imageMetadata.width, imageMetadata.height) * 0.04))
    const left = Math.max(0, imageMetadata.width - targetWidth - margin)
    const top = Math.max(0, imageMetadata.height - targetHeight - margin)

    const watermarkBuffer = await sharp(WATERMARK_FILE)
      .resize(targetWidth, targetHeight, { fit: 'inside' })
      .png()
      .toBuffer()

    const pipeline = sharp(buffer).composite([{ input: watermarkBuffer, left, top }])

    if (imageMetadata.format === 'jpeg' || imageMetadata.format === 'jpg') {
      pipeline.jpeg({ quality: 92 })
    } else if (imageMetadata.format === 'png') {
      pipeline.png()
    } else if (imageMetadata.format === 'webp') {
      pipeline.webp({ quality: 92 })
    }

    const processed = await pipeline.toBuffer()
    console.log('[watermark] ✅ Applied watermark to uploaded photo')
    return processed
  } catch (error) {
    console.warn('[watermark] Failed to apply watermark, saving original image:', error.message)
    return buffer
  }
}

// Upload endpoint simplified for local storage only
app.post('/api/upload', upload.single('file'), async (req, res) => {
  console.log('[upload] Upload request received')

  if (!req.file) {
    console.log('[upload] No file uploaded')
    return res.status(400).json({ error: 'No file uploaded' })
  }

  console.log('[upload] File received:', {
    originalname: req.file.originalname,
    mimetype: req.file.mimetype,
    size: req.file.size
  })

  const timestamp = Date.now()
  const extension = (req.file.originalname.split('.').pop() || 'jpg').toLowerCase()
  const isGif = extension === 'gif'
  const filename = `DigiOH_PhotoBox_${timestamp}.${extension}`
  const targetDir = isGif ? UPLOAD_GIF_DIR : UPLOAD_IMG_DIR
  const localPath = path.join(targetDir, filename)

  try {
    ensureDir(targetDir)
    const fileBuffer = isGif
      ? req.file.buffer
      : await applyWatermarkToBuffer(req.file.buffer, req.file.mimetype)
    fs.writeFileSync(localPath, fileBuffer)

    console.log('[upload] File saved locally:', localPath)

    const subDir = isGif ? 'gif' : 'img'
    const relativePath = path.posix.join('uploads', subDir, filename)
    const basePublicUrl = resolvePublicBaseUrl(req)
    const webPath = relativePath.replace(/\\/g, '/')
    const directLink = `${basePublicUrl}/${webPath}`
    
    const localResult = {
      provider: 'local',
      downloadUrl: `/${webPath}`,
      viewUrl: `/${webPath}`,
      directLink,
      relativePath: webPath
    }

    const qrTarget = directLink
    const qrDataURL = await QRCode.toDataURL(qrTarget, {
      width: 300,
      margin: 2,
      color: { dark: '#000000', light: '#FFFFFF' }
    })

    return res.json({
      success: true,
      downloadUrl: localResult.downloadUrl,
      viewUrl: localResult.viewUrl,
      directLink: localResult.directLink,
      qrCode: qrDataURL,
      filename,
      storageProvider: 'local',
      storageResults: [localResult]
    })
  } catch (error) {
    console.error('[upload] Error during local save or QR generation:', error)
    return res.status(500).json({ error: 'File processing failed.' })
  }
})

// Serve uploaded files
app.use('/uploads', express.static(UPLOAD_BASE_DIR))

// Serve the main app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'dist', 'index.html'))
})

app.listen(PORT, () => {
  console.log(`[server] Running on port ${PORT}`)
  console.log(`[storage] Provider forced to 'local'`)
})
