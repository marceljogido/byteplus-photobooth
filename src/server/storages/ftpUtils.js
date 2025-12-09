/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import 'dotenv/config'
import { Client } from 'basic-ftp'
import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const USE_FTP_CONFIG_FILE = String(process.env.FTP_USE_CONFIG_FILE || process.env.USE_CONFIG_FILES || '').toLowerCase() === 'true'
const WATERMARK_FILE =
  process.env.WATERMARK_FILE_PATH
    ? path.resolve(process.env.WATERMARK_FILE_PATH)
    : path.resolve(__dirname, '..', '..', '..', 'public', 'BytePlus.png')
const WATERMARK_POSITION = String(process.env.WATERMARK_POSITION || 'top-right').toLowerCase()
const UPLOAD_BASE_DIR =
  process.env.UPLOAD_BASE_DIR
    ? path.resolve(process.env.UPLOAD_BASE_DIR)
    : path.resolve(__dirname, '..', '..', '..', 'public', 'uploads')
const UPLOAD_TEMP_DIR = path.join(
  process.env.FTP_TEMP_DIR ? path.resolve(process.env.FTP_TEMP_DIR) : UPLOAD_BASE_DIR,
  'temp'
)

if (!fs.existsSync(WATERMARK_FILE)) {
  console.warn(`⚠️ FTP watermark file not found at ${WATERMARK_FILE}`)
}

if (!fs.existsSync(UPLOAD_BASE_DIR)) {
  fs.mkdirSync(UPLOAD_BASE_DIR, { recursive: true })
}

if (!fs.existsSync(UPLOAD_TEMP_DIR)) {
  fs.mkdirSync(UPLOAD_TEMP_DIR, { recursive: true })
}

// Default FTP configuration, overridable via env or config file
function normalizeBaseUrl(url) {
  if (!url) return ''
  return url.replace(/\/$/, '')
}

function normalizePath(p) {
  if (!p) return '/'
  let out = p.replace(/\\/g, '/').replace(/\/+/g, '/')
  if (!out.startsWith('/')) out = '/' + out
  if (!out.endsWith('/')) out = out + '/'
  return out
}

let ftpConfig = {
  ftpAddress: process.env.FTP_HOST || 'webhosting67.1blu.de',
  ftpUsername: process.env.FTP_USER || 'ftp173957-digiOh',
  ftpPassword: process.env.FTP_PASSWORD || 'Passworddigioh2025#',
  ftpPort: Number(process.env.FTP_PORT || 21),
  ftpPath: normalizePath(process.env.FTP_REMOTE_PATH || '/_sfpg_data/image/'),
  displayUrl: normalizeBaseUrl(process.env.FTP_DISPLAY_URL || 'https://wsaseno.de/digiOH_files'),
  secure: String(process.env.FTP_SECURE || 'false').toLowerCase() === 'true'
}

// Load configuration from file
function loadFtpConfig() {
  if (!USE_FTP_CONFIG_FILE) {
    console.log('ℹ️ FTP config file disabled; using environment variables only')
    return
  }
  try {
    const configPath = path.join(__dirname, 'digiOH_PhotoBox_config_ftp.json')
    if (fs.existsSync(configPath)) {
      const configData = fs.readFileSync(configPath, 'utf8')
      const config = JSON.parse(configData)
      ftpConfig = { ...ftpConfig, ...config }
      ftpConfig.ftpPath = normalizePath(ftpConfig.ftpPath)
      ftpConfig.displayUrl = normalizeBaseUrl(ftpConfig.displayUrl)
      console.log('✅ FTP configuration loaded from file')
    } else {
      console.log('⚠️ FTP config file not found, using defaults')
    }
  } catch (error) {
    console.error('❌ Error loading FTP config:', error.message)
    console.log('🔄 Using default configuration')
  }
}

// Get current FTP configuration
export function getFtpConfig() {
  return { ...ftpConfig }
}

// Update FTP configuration
export function updateFtpConfig(newConfig) {
  // Apply with normalization
  ftpConfig = { 
    ...ftpConfig, 
    ...newConfig,
    ftpPath: normalizePath(newConfig?.ftpPath ?? ftpConfig.ftpPath),
    displayUrl: normalizeBaseUrl(newConfig?.displayUrl ?? ftpConfig.displayUrl)
  }
  
  // Save to file
  if (USE_FTP_CONFIG_FILE) {
    try {
      const configPath = path.join(__dirname, 'digiOH_PhotoBox_config_ftp.json')
      fs.writeFileSync(configPath, JSON.stringify(ftpConfig, null, 2))
      console.log('✅ FTP configuration saved to file')
    } catch (error) {
      console.error('❌ Error saving FTP config:', error.message)
    }
  }
}

function buildPublicUrl(remotePath) {
  const baseUrl = normalizeBaseUrl(ftpConfig.displayUrl || '')

  if (!remotePath) {
    return baseUrl
  }

  const remoteNormalized = remotePath
    .replace(/\\/g, '/')
    .replace(/\/+/g, '/')
    .replace(/^\/+/, '')

  const ftpPathNormalized = (ftpConfig.ftpPath || '')
    .replace(/\\/g, '/')
    .replace(/\/+/g, '/')
    .replace(/^\/+/, '')
    .replace(/\/+$/, '')

  let relativeRemote = remoteNormalized

  if (ftpPathNormalized) {
    let displayPath = ''
    try {
      if (baseUrl && baseUrl.includes('://')) {
        displayPath = new URL(`${baseUrl}/`).pathname.replace(/^\/+|\/+$/g, '')
      } else if (baseUrl) {
        const trimmed = baseUrl.replace(/^[^/]*\/\/[^/]+/, '')
        displayPath = trimmed.replace(/^\/+|\/+$/g, '')
      }
    } catch (err) {
      displayPath = ''
    }

    const ftpPrefix = ftpPathNormalized
    const hasFtpPrefix =
      relativeRemote === ftpPrefix ||
      relativeRemote.startsWith(`${ftpPrefix}/`)

    if (hasFtpPrefix && displayPath.endsWith(ftpPrefix)) {
      relativeRemote =
        relativeRemote === ftpPrefix
          ? ''
          : relativeRemote.slice(ftpPrefix.length + 1)
    }
  }

  const finalPath = relativeRemote ? `/${relativeRemote}` : ''

  if (!baseUrl) {
    return relativeRemote ? finalPath : ''
  }

  return `${baseUrl}${finalPath}`
}

// Get FTP client configuration
function getConfig() {
  return {
    host: ftpConfig.ftpAddress,
    user: ftpConfig.ftpUsername,
    password: ftpConfig.ftpPassword,
    port: ftpConfig.ftpPort,
    secure: ftpConfig.secure,
  }
}

// Upload file to FTP
export async function uploadToFTP(localPath, remotePath) {
  const client = new Client()
  try {
    console.log('🔄 === FTP UPLOAD START ===')
    console.log(`📁 Local file: ${localPath}`)
    console.log(`🌐 Remote file: ${remotePath}`)
    
    const config = getConfig()
    await client.access(config)
    console.log('✅ Connected to FTP server')

    // Ensure the remote directory exists
    const remoteDir = path.dirname(remotePath).replace(/\\/g, '/')
    console.log(`📁 Ensuring remote directory: ${remoteDir}`)
    await client.ensureDir(remoteDir)

    // Upload file
    await client.uploadFrom(localPath, remotePath)
    console.log('✅ File uploaded successfully!')
    
    // Build public URL while avoiding duplicate path segments
    const finalUrl = buildPublicUrl(remotePath)
    console.log(`🔗 Final URL: ${finalUrl}`)
    
    return finalUrl
  } catch (err) {
    console.error('❌ FTP upload error:', err)
    throw err
  } finally {
    client.close()
  }
}

// Download file from URL or copy local file
export async function downloadFile(url, localPath) {
  try {
    console.log(`📥 Processing file: ${url}`)
    
    // Check if it's a local file path
    if (url.startsWith('C:\\') || url.startsWith('/') || url.startsWith('./') || url.startsWith('../')) {
      // It's a local file, just copy it
      console.log(`📁 Copying local file: ${url}`)
      fs.copyFileSync(url, localPath)
      console.log(`✅ File copied to: ${localPath}`)
    } else {
      // It's a URL, download it
      console.log(`🌐 Downloading from URL: ${url}`)
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const buffer = await response.arrayBuffer()
      fs.writeFileSync(localPath, Buffer.from(buffer))
      console.log(`✅ File downloaded to: ${localPath}`)
    }
  } catch (error) {
    console.error('❌ Download error:', error.message)
    throw error
  }
}

// Add watermark to image
export async function addWatermark(inputPath, watermarkPath, outputPath) {
  try {
    console.log('🖼️ Adding watermark...')
    console.log(`📁 Input: ${inputPath}`)
    console.log(`🎨 Watermark: ${watermarkPath}`)
    console.log(`📁 Output: ${outputPath}`)

    // Check if watermark file exists
    if (!fs.existsSync(watermarkPath)) {
      console.log('⚠️ Watermark file not found, skipping watermark')
      // Just copy the original file
      fs.copyFileSync(inputPath, outputPath)
      return
    }

    // Get image dimensions
    const inputMetadata = await sharp(inputPath).metadata()
    const watermarkMetadata = await sharp(watermarkPath).metadata()
    
    console.log(`📐 Input size: ${inputMetadata.width}x${inputMetadata.height}`)
    console.log(`🎨 Watermark size: ${watermarkMetadata.width}x${watermarkMetadata.height}`)

    // Calculate watermark size (20% of image width)
    const watermarkWidth = Math.floor(inputMetadata.width * 0.2)
    const watermarkHeight = Math.floor((watermarkWidth * watermarkMetadata.height) / watermarkMetadata.width)

    // Resize watermark
    const resizedWatermark = await sharp(watermarkPath)
      .resize(watermarkWidth, watermarkHeight)
      .png()
      .toBuffer()

    // Calculate position based on env (default top-right)
    const margin = 20
    const computePosition = () => {
      switch (WATERMARK_POSITION) {
        case 'top-left':
          return { x: margin, y: margin }
        case 'bottom-left':
          return { x: margin, y: inputMetadata.height - watermarkHeight - margin }
        case 'bottom-right':
          return { x: inputMetadata.width - watermarkWidth - margin, y: inputMetadata.height - watermarkHeight - margin }
        case 'top-right':
        default:
          return { x: inputMetadata.width - watermarkWidth - margin, y: margin }
      }
    }
    const { x, y } = computePosition()

    console.log(`📍 Watermark position: x=${x}, y=${y}`)
    console.log(`📏 Watermark size: ${watermarkWidth}x${watermarkHeight}`)

    // Composite watermark onto image
    await sharp(inputPath)
      .composite([
        {
          input: resizedWatermark,
          top: y,
          left: x,
        }
      ])
      .jpeg({ quality: 90 })
      .toFile(outputPath)

    console.log('✅ Watermark added successfully!')
  } catch (error) {
    console.error('❌ Watermark error:', error.message)
    // Fallback: just copy the original file
    try {
      fs.copyFileSync(inputPath, outputPath)
      console.log('⚠️ Watermark failed, using original image')
    } catch (copyError) {
      console.error('❌ Copy fallback failed:', copyError.message)
      throw error
    }
  }
}

// Main upload function with watermark
export async function uploadFile(localFile, remoteFile) {
  console.log('🚀 === FTP UPLOAD START ===')
  console.log(`📁 Local file: ${localFile}`)
  console.log(`🌐 Remote file: ${remoteFile}`)
  console.log(`🔗 Final URL will be: ${buildPublicUrl(remoteFile)}`)

  try {
    console.log('🔄 Starting FTP upload...')
    const result = await uploadToFTP(localFile, remoteFile)
    console.log('✅ FTP upload completed successfully!')
    return result
  } catch (err) {
    console.log('💥 === FTP UPLOAD ERROR ===')
    console.error('❌ FTP Error:', err.message)
    console.error('❌ Full error:', err)
    console.log('💥 === END FTP ERROR ===')
    throw err
  }
}

// Copy file with watermark processing
export async function copyFile(fileUrl, remoteFile) {
  const localFile = path.basename(fileUrl)
  console.log(`📁 Processing file: ${localFile}`)

  // Use temp directory for watermark processing
  const uploadsDir = UPLOAD_TEMP_DIR

  // Set paths
  const localFilePath = path.join(uploadsDir, localFile)
  const watermarkedFilePath = path.join(uploadsDir, 'watermarked_' + localFile)
  const watermarkPath = WATERMARK_FILE

  try {
    console.log('📥 Downloading file...')
    await downloadFile(fileUrl, localFilePath)

    console.log('🎨 Adding watermark...')
    await addWatermark(localFilePath, watermarkPath, watermarkedFilePath)

    console.log('📤 Uploading to FTP...')
    const result = await uploadFile(watermarkedFilePath, remoteFile)
    
    // Clean up files
    try {
      if (fs.existsSync(localFilePath)) {
        fs.unlinkSync(localFilePath)
        console.log(`🗑️ Cleaned up: ${localFilePath}`)
      }
    } catch (unlinkErr) {
      console.warn(`⚠️ Could not delete ${localFilePath}:`, unlinkErr.message)
    }
    
    try {
      if (fs.existsSync(watermarkedFilePath)) {
        fs.unlinkSync(watermarkedFilePath)
        console.log(`🗑️ Cleaned up: ${watermarkedFilePath}`)
      }
    } catch (unlinkErr) {
      console.warn(`⚠️ Could not delete ${watermarkedFilePath}:`, unlinkErr.message)
    }
    
    return result
  } catch (err) {
    console.error('❌ Error in copyFile:', err)
    throw err
  }
}

// Test FTP connection
export async function testFtpConnection() {
  const client = new Client()
  try {
    console.log('🔄 Testing FTP connection...')
    const config = getConfig()
    await client.access(config)
    console.log('✅ FTP connection successful!')
    return { success: true, message: 'FTP connection successful' }
  } catch (error) {
    console.error('❌ FTP connection failed:', error.message)
    return { success: false, message: error.message }
  } finally {
    client.close()
  }
}

// Initialize FTP configuration
loadFtpConfig()
