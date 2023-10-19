import sharp from 'sharp'

// TODO: Video Thumbnail Generation

export default async function generateThumbnail (mimetype, fileBuffer) {
  if (mimetype.includes('image') === false) return null

  return sharp(fileBuffer)
  .resize({
    width: 250,
    height: 250,
    fit: 'cover',
    position: 'entropy',
    background: {
      r: 0,
      g: 0,
      b: 0,
      alpha: 0
    },
    kernel: 'lanczos3',
    withoutEnlargement: true,
    fastShrinkOnLoad: true
  })
  .webp({ quality: 50 })
  .toBuffer()
}
