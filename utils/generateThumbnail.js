import { spawn } from 'node:child_process'
import { Readable } from 'node:stream'
import ffmpegBin from 'ffmpeg-static'
import { Log } from 'cmd430-utils'
import sharp from 'sharp'

// eslint-disable-next-line no-unused-vars
const { log, debug, info, warn, error } = new Log('Thumbnail Generator')

async function ffmpeg (inputBuffer, type) {
  const args = {
    'video': [ '-r', '1', '-i', 'pipe:0', '-vframes', '1', '-f', 'image2', '-q:v', '1', '-c:v', 'mjpeg', 'pipe:1' ],
    'audio': [ '-i', 'pipe:0', '-f', 'image2', '-q:v', '1', '-c:v', 'mjpeg', 'pipe:1' ]
  }

  let imageBuffer = null

  try {

    const image = new Promise((resolve, reject) => {
      let outBuffer = null
      const ffmpegProc = spawn(ffmpegBin, args[type])

      // Get Buffer as Input Stream
      ffmpegProc.stdin.on('error', err => {
        /*
         * we get an EOF error without this error handler but everything is fine,
         * log the error if it is anything else
         */
        if (err.code === 'EOF') return

        error('[FFMPEG stdin Error]', err.message)
        ffmpegProc.kill()
      })

      Readable.from(inputBuffer).pipe(ffmpegProc.stdin)

      // Get output as Buffer
      const buffers = []
      ffmpegProc.stdout.on('readable', () => {
        for (;;) {
          const buffer = ffmpegProc.stdout.read()
          if (!buffer) break
          buffers.push(buffer)
        }
      })
      ffmpegProc.stdout.on('end', () => {
        outBuffer = Buffer.concat(buffers)
      })

      ffmpegProc.on('close', () => resolve(outBuffer))
      ffmpegProc.on('error', err => {
        error('[FFMPEG Error]', err.message)
        resolve(outBuffer)
        ffmpegProc.kill()
      })
    })

    imageBuffer = await image
  } catch (err) {
    imageBuffer = null
  }
  return imageBuffer
}

export default async function generateThumbnail (mimetype, fileBuffer) {
  let imageBuffer

  if (mimetype.includes('image')) {
    imageBuffer = fileBuffer
  }
  if (mimetype.includes('video')) {
    imageBuffer = await ffmpeg(fileBuffer, 'video')
  }
  if (mimetype.includes('audio')) {
    imageBuffer = await ffmpeg(fileBuffer, 'audio')
  }
  if (imageBuffer instanceof Buffer === false) return null

  // Resize and crop Thumbnails
  return sharp(imageBuffer)
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
