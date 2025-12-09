/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import {GIFEncoder, quantize, applyPalette} from 'https://unpkg.com/gifenc'
import useStore from './store'
import imageData from './imageData'
import gen from './llm'
import modes from './modes'

const get = useStore.getState
const set = useStore.setState
const GIF_MAX_LONG_SIDE = 720
const WATERMARK_SOURCE = '/BytePlus.png'
const DEFAULT_CANVAS_BACKGROUND = '#0b1120'

const loadImage = src =>
  new Promise((resolve, reject) => {
    if (typeof Image === 'undefined') {
      reject(new Error('Image constructor unavailable'))
      return
    }
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })

let watermarkImagePromise = null

const getWatermarkImage = async () => {
  if (!watermarkImagePromise) {
    watermarkImagePromise = loadImage(WATERMARK_SOURCE).catch(error => {
      watermarkImagePromise = null
      throw error
    })
  }
  return watermarkImagePromise
}
const buildMetaFromDimensions = (width, height) => {
  const safeWidth = Math.max(1, Math.round(width || 0))
  const safeHeight = Math.max(1, Math.round(height || 0))
  const aspect = safeWidth / safeHeight
  return {
    width: safeWidth,
    height: safeHeight,
    aspect,
    orientation: safeHeight >= safeWidth ? 'portrait' : 'landscape'
  }
}

const normalizeMeta = meta => {
  if (!meta) return null
  const {width, height} = meta
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null
  }
  return buildMetaFromDimensions(width, height)
}

const renderImageToCanvas = async (
  image,
  width,
  height,
  {withWatermark = false, background = DEFAULT_CANVAS_BACKGROUND} = {}
) => {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width))
  canvas.height = Math.max(1, Math.round(height))
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = background
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const sourceWidth = Math.max(1, image.width || 1)
  const sourceHeight = Math.max(1, image.height || 1)
  const scale = Math.min(canvas.width / sourceWidth, canvas.height / sourceHeight)
  const drawWidth = sourceWidth * scale
  const drawHeight = sourceHeight * scale
  const offsetX = (canvas.width - drawWidth) / 2
  const offsetY = (canvas.height - drawHeight) / 2
  ctx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight)

  if (withWatermark) {
    try {
      const watermark = await getWatermarkImage()
      if (watermark && watermark.width && watermark.height) {
        const base = Math.min(canvas.width, canvas.height)
        const desiredWidth = base * 0.22
        const aspect = watermark.width / watermark.height
        const desiredHeight = desiredWidth / aspect
        const margin = Math.max(10, Math.round(base * 0.04))
        const x = canvas.width - desiredWidth - margin
        const y = canvas.height - desiredHeight - margin
        ctx.drawImage(watermark, x, y, desiredWidth, desiredHeight)
      }
    } catch (error) {
      console.warn('Failed to apply watermark:', error)
    }
  }

  return {canvas, ctx}
}

const loadAndRenderImage = async (base64Data, width, height, options = {}) => {
  const image = await loadImage(base64Data)
  const rendered = await renderImageToCanvas(image, width, height, options)
  return {...rendered, image}
}

const ensureOutputMatchesMeta = async (base64Data, targetMeta) => {
  let image
  try {
    image = await loadImage(base64Data)
  } catch (error) {
    console.warn('Unable to load AI output for normalization:', error)
    const fallbackMeta =
      normalizeMeta(targetMeta) || buildMetaFromDimensions(1, 1)
    return {dataUrl: base64Data, meta: fallbackMeta}
  }

  const desiredMeta =
    normalizeMeta(targetMeta) ||
    buildMetaFromDimensions(image.width || 1, image.height || 1)

  if (
    image.width === desiredMeta.width &&
    image.height === desiredMeta.height
  ) {
    return {dataUrl: base64Data, meta: desiredMeta}
  }

  const {canvas} = await renderImageToCanvas(image, desiredMeta.width, desiredMeta.height, {
    background: DEFAULT_CANVAS_BACKGROUND
  })

  return {
    dataUrl: canvas.toDataURL('image/png'),
    meta: desiredMeta
  }
}
const model = 'gemini-2.5-flash-image'

export const init = () => {
  if (get().didInit) {
    return
  }

  set(state => {
    state.didInit = true
  })
}

// ...existing code...
export const snapPhoto = async (b64, meta) => {
  const id = crypto.randomUUID()
  const {activeMode, customPrompt} = get()
  imageData.inputs[id] = b64
  const normalizedInputMeta = normalizeMeta(meta)
  imageData.meta[id] = normalizedInputMeta ? {input: normalizedInputMeta} : {}

  set(state => {
    state.photos.unshift({id, mode: activeMode, isBusy: true})
  })

  try {
    const result = await gen({
      model,
      prompt: activeMode === 'custom' ? customPrompt : modes[activeMode].prompt,
      inputFile: b64
    })
    const normalizedOutput = await ensureOutputMatchesMeta(result, normalizedInputMeta)
    const existingMeta = imageData.meta[id] || {}

    imageData.outputs[id] = normalizedOutput.dataUrl
    imageData.meta[id] = {
      input: existingMeta.input || normalizedInputMeta || normalizedOutput.meta,
      output: normalizedOutput.meta
    }

    set(state => {
      state.photos = state.photos.map(photo =>
        photo.id === id ? {...photo, isBusy: false} : photo
      )
    })
    
    return id // Return the photo ID
  } catch (error) {
    console.error('Error processing photo:', error)
    set(state => {
      state.photos = state.photos.map(photo =>
        photo.id === id ? {...photo, isBusy: false, error: error.message} : photo
      )
    })
    alert('Gagal memproses foto: ' + error.message)
    return id // Still return ID even on error
  }
}
// ...existing code...

export const deletePhoto = id => {
  set(state => {
    state.photos = state.photos.filter(photo => photo.id !== id)
  })

  delete imageData.inputs[id]
  delete imageData.outputs[id]
  delete imageData.meta[id]
}

export const setMode = mode =>
  set(state => {
    state.activeMode = mode
  })

const processImageToCanvas = async (
  base64Data,
  width,
  height,
  {withWatermark = false, background = DEFAULT_CANVAS_BACKGROUND} = {}
) => {
  const {ctx, canvas} = await loadAndRenderImage(base64Data, width, height, {
    withWatermark,
    background
  })
  return ctx.getImageData(0, 0, canvas.width, canvas.height)
}

const addFrameToGif = (gif, imageData, width, height, delay) => {
  const palette = quantize(imageData.data, 256)
  const indexed = applyPalette(imageData.data, palette)

  gif.writeFrame(indexed, width, height, {
    palette,
    delay
  })
}

export const makeGif = async () => {
  const {photos, gifUrl: previousGifUrl} = get()

  set(state => {
    state.gifInProgress = true
  })

  try {
    const readyPhotos = photos.filter(photo => !photo.isBusy)
    if (readyPhotos.length === 0) {
      console.warn('makeGif called without any ready photos')
      return null
    }

    const [latestPhoto] = readyPhotos
    const latestId = latestPhoto.id

    const gif = new GIFEncoder()

    const inputBase64 = imageData.inputs[latestId]
    const outputBase64 = imageData.outputs[latestId]

    if (!inputBase64 || !outputBase64) {
      console.warn('Missing input or output image data for GIF generation')
      return null
    }

    const baseMeta =
      imageData.meta[latestId]?.output ||
      imageData.meta[latestId]?.input ||
      buildMetaFromDimensions(GIF_MAX_LONG_SIDE, GIF_MAX_LONG_SIDE)
    const longestSide = Math.max(baseMeta.width, baseMeta.height)
    const scale =
      longestSide > GIF_MAX_LONG_SIDE
        ? GIF_MAX_LONG_SIDE / longestSide
        : 1
    const frameWidth = Math.max(1, Math.round(baseMeta.width * scale))
    const frameHeight = Math.max(1, Math.round(baseMeta.height * scale))

    imageData.meta[latestId] = {
      ...(imageData.meta[latestId] || {}),
      gif: buildMetaFromDimensions(frameWidth, frameHeight)
    }

    const inputImageData = await processImageToCanvas(
      inputBase64,
      frameWidth,
      frameHeight,
      {withWatermark: true}
    )
    addFrameToGif(gif, inputImageData, frameWidth, frameHeight, 333)

    const outputImageData = await processImageToCanvas(
      outputBase64,
      frameWidth,
      frameHeight,
      {withWatermark: true}
    )
    addFrameToGif(gif, outputImageData, frameWidth, frameHeight, 833)

    gif.finish()

    if (previousGifUrl && typeof previousGifUrl === 'string' && previousGifUrl.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(previousGifUrl)
      } catch (error) {
        console.warn('Failed to revoke previous GIF URL:', error)
      }
    }

    const gifUrl = URL.createObjectURL(
      new Blob([gif.buffer], {type: 'image/gif'})
    )

    // Hanya pertahankan data foto terbaru
    Object.keys(imageData.inputs).forEach(key => {
      if (key !== latestId) {
        delete imageData.inputs[key]
      }
    })
    Object.keys(imageData.outputs).forEach(key => {
      if (key !== latestId) {
        delete imageData.outputs[key]
      }
    })
    Object.keys(imageData.meta).forEach(key => {
      if (key !== latestId) {
        delete imageData.meta[key]
      }
    })

    set(state => {
      state.gifUrl = gifUrl
      state.photos = state.photos.filter(photo => photo.id === latestId)
    })

    return gifUrl
  } catch (error) {
    console.error('Error creating GIF:', error)
    return null
  } finally {
    set(state => {
      state.gifInProgress = false
    })
  }
}

export const resetSession = () => {
  const {gifUrl} = get()

  // Bersihkan semua data foto yang tersimpan
  Object.keys(imageData.inputs).forEach(key => {
    delete imageData.inputs[key]
  })
  Object.keys(imageData.outputs).forEach(key => {
    delete imageData.outputs[key]
  })
  Object.keys(imageData.meta).forEach(key => {
    delete imageData.meta[key]
  })

  if (gifUrl && typeof gifUrl === 'string' && gifUrl.startsWith('blob:')) {
    try {
      URL.revokeObjectURL(gifUrl)
    } catch (error) {
      console.warn('Failed to revoke GIF object URL:', error)
    }
  }

  set(state => {
    state.photos = []
    state.gifUrl = null
    state.gifInProgress = false
  })
}

export const hideGif = () =>
  set(state => {
    state.gifUrl = null
  })

export const setCustomPrompt = prompt =>
  set(state => {
    state.customPrompt = prompt
  })
