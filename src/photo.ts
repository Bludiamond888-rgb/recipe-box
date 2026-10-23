// Downscale a picked/taken photo to a ~1200px JPEG before storing it.
export const MAX_SIDE = 1200

export function fitSize(w: number, h: number, max = MAX_SIDE) {
  const s = Math.min(1, max / Math.max(w, h))
  return { w: Math.round(w * s), h: Math.round(h * s) }
}

async function decode(file: Blob): Promise<{ src: CanvasImageSource; w: number; h: number; close?: () => void }> {
  if ('createImageBitmap' in window) {
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' })
      return { src: bmp, w: bmp.width, h: bmp.height, close: () => bmp.close() }
    } catch { /* fall back to <img> (e.g. HEIC on older engines) */ }
  }
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    return { src: img, w: img.naturalWidth, h: img.naturalHeight }
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
}

export async function compressPhoto(file: Blob, quality = 0.82): Promise<Blob> {
  const img = await decode(file)
  const { w, h } = fitSize(img.w, img.h)
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, w, h)
  ctx.drawImage(img.src, 0, 0, w, h)
  img.close?.()
  const blob = await new Promise<Blob | null>((ok) => c.toBlob(ok, 'image/jpeg', quality))
  c.width = c.height = 0
  if (!blob) throw new Error('Could not process that photo.')
  return blob
}
