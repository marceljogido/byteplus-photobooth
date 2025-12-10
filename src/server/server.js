import express from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import crypto from 'crypto'
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
const WATERMARK_FILE_WHITE = path.resolve(__dirname, '..', '..', 'public', 'watermark-putih.png')
const WATERMARK_FILE_BLACK = path.resolve(__dirname, '..', '..', 'public', 'watermark-hitam.png')
const WATERMARK_POSITION = String(process.env.WATERMARK_POSITION || 'top-right').toLowerCase()
const WATERMARK_VARIANT = String(process.env.WATERMARK_VARIANT || 'putih').toLowerCase()
const normalizePem = value =>
  (value || '')
    .replace(/\\n/g, '\n')
    .trim()

const readPemFromFile = filePath => {
  if (!filePath) return ''
  try {
    const content = fs.readFileSync(path.resolve(filePath), 'utf8')
    return content.trim()
  } catch (error) {
    console.warn(`[qz] Unable to read PEM file ${filePath}:`, error.message)
    return ''
  }
}

const resolvePem = (inlineValue, filePath, label) => {
  const normalized = normalizePem(inlineValue)
  if (normalized) return normalized
  const fileContent = readPemFromFile(filePath)
  if (fileContent) return fileContent
  if (filePath) {
    console.warn(`[qz] ${label} file provided but empty/unreadable: ${filePath}`)
  }
  return ''
}

const QZ_CERTIFICATE = resolvePem(
  process.env.QZ_CERTIFICATE,
  process.env.QZ_CERT_FILE,
  'certificate'
)
const QZ_PRIVATE_KEY = resolvePem(
  process.env.QZ_PRIVATE_KEY,
  process.env.QZ_PRIVATE_KEY_FILE,
  'private key'
)

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

const normalizeBaseUrl = value => {
  if (!value) return ''
  const trimmed = value.trim().replace(/\/+$/, '')
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed)) {
    return trimmed
  }
  // If someone sets "example.com" or "http:example.com", force http:// prefix
  const withoutSlashes = trimmed.replace(/^\/+/, '')
  const withoutProto = withoutSlashes.replace(/^[a-zA-Z][a-zA-Z0-9+.-]*:/, '')
  return `http://${withoutProto}`
}

const resolvePublicBaseUrl = req => {
  const configured = normalizeBaseUrl(process.env.PUBLIC_BASE_URL || '')
  if (configured) {
    return configured
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
if (QZ_CERTIFICATE) {
  console.log(
    `[qz] Certificate configured via ${
      process.env.QZ_CERTIFICATE ? 'QZ_CERTIFICATE' : 'QZ_CERT_FILE'
    }`
  )
}
if (QZ_PRIVATE_KEY) {
  console.log(
    `[qz] Private key configured via ${
      process.env.QZ_PRIVATE_KEY ? 'QZ_PRIVATE_KEY' : 'QZ_PRIVATE_KEY_FILE'
    }`
  )
}

app.get('/api/qz/cert', (req, res) => {
  if (!QZ_CERTIFICATE) {
    return res.status(404).json({ error: 'QZ certificate not configured' })
  }
  res.type('text/plain').send(QZ_CERTIFICATE)
})

app.post('/api/qz/sign', (req, res) => {
  if (!QZ_PRIVATE_KEY) {
    return res.status(400).json({ error: 'QZ private key not configured' })
  }
  const payload = req.body?.payload
  if (!payload || typeof payload !== 'string') {
    return res.status(400).json({ error: 'Missing payload for signing' })
  }

  try {
    const signer = crypto.createSign('sha256')
    signer.update(payload)
    signer.end()
    const signature = signer.sign(QZ_PRIVATE_KEY, 'base64')
    return res.json({ signature })
  } catch (error) {
    console.error('[qz] Failed to sign payload:', error)
    return res.status(500).json({ error: 'Unable to sign payload' })
  }
})

const shouldWatermarkMimetype = mimetype => {
  if (!mimetype) return true
  const normalized = String(mimetype).toLowerCase()
  return normalized.startsWith('image/') && normalized !== 'image/gif'
}

const resolveWatermarkPath = variant => {
  const desired =
    variant === 'hitam'
      ? WATERMARK_FILE_BLACK
      : variant === 'putih'
      ? WATERMARK_FILE_WHITE
      : WATERMARK_FILE
  if (desired && fs.existsSync(desired)) return desired
  if (fs.existsSync(WATERMARK_FILE_WHITE)) return WATERMARK_FILE_WHITE
  if (fs.existsSync(WATERMARK_FILE_BLACK)) return WATERMARK_FILE_BLACK
  return WATERMARK_FILE
}

const applyWatermarkToBuffer = async (buffer, mimetype, options = {}) => {
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

    const watermarkPath = resolveWatermarkPath(options.variant || WATERMARK_VARIANT)
    const watermarkMetadata = await sharp(watermarkPath).metadata()
    if (!watermarkMetadata?.width || !watermarkMetadata?.height) {
      console.warn('[watermark] Unable to read watermark metadata; skipping.')
      return buffer
    }

    const scale = Number.isFinite(options.scale) && options.scale > 0 ? options.scale : 0.2
    const targetWidth = Math.max(1, Math.round(imageMetadata.width * scale))
    const targetHeight = Math.max(
      1,
      Math.round(targetWidth * (watermarkMetadata.height / watermarkMetadata.width))
    )
    const margin = Math.max(10, Math.round(Math.min(imageMetadata.width, imageMetadata.height) * 0.04))
    const computePosition = () => {
      const position = (options.position || WATERMARK_POSITION || '').toLowerCase()
      switch (position) {
        case 'top-left':
          return { left: margin, top: margin }
        case 'top-center':
          return { left: Math.max(0, Math.round((imageMetadata.width - targetWidth) / 2)), top: margin }
        case 'bottom-left':
          return { left: margin, top: Math.max(0, imageMetadata.height - targetHeight - margin) }
        case 'bottom-right':
          return {
            left: Math.max(0, imageMetadata.width - targetWidth - margin),
            top: Math.max(0, imageMetadata.height - targetHeight - margin)
          }
        case 'bottom-center':
          return {
            left: Math.max(0, Math.round((imageMetadata.width - targetWidth) / 2)),
            top: Math.max(0, imageMetadata.height - targetHeight - margin)
          }
        case 'top-right':
        default:
          return {
            left: Math.max(0, imageMetadata.width - targetWidth - margin),
            top: margin
          }
      }
    }
    const { left, top } = computePosition()

    const watermarkBuffer = await sharp(watermarkPath)
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
  const filename = `BytePlus_${timestamp}.${extension}`
  const targetDir = isGif ? UPLOAD_GIF_DIR : UPLOAD_IMG_DIR
  const localPath = path.join(targetDir, filename)

  try {
    ensureDir(targetDir)
    const wmPosition =
      (req.body?.watermarkPosition || WATERMARK_POSITION || '').toLowerCase()
    const wmVariant = (req.body?.watermarkVariant || WATERMARK_VARIANT || '').toLowerCase()
    const wmScaleRaw = req.body?.watermarkScale
    const wmScale = typeof wmScaleRaw === 'string' ? parseFloat(wmScaleRaw) : Number(wmScaleRaw)

    const fileBuffer = isGif
      ? req.file.buffer
      : await applyWatermarkToBuffer(req.file.buffer, req.file.mimetype, {
          position: wmPosition,
          variant: wmVariant,
          scale: wmScale
        })
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
