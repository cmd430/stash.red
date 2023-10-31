import { spawn } from 'node:child_process'
import { resolve } from 'path'
import { readFile } from 'fs/promises'
import { Readable } from 'node:stream'
import ffmpegBin from 'ffmpeg-static'
import { Log } from 'cmd430-utils'
import sharp from 'sharp'
import { mimetypeFilter } from './mimetype.js'

// eslint-disable-next-line no-unused-vars
const { log, debug, info, warn, error } = new Log('Thumbnail Generator')
const thumbnailFontPath = resolve('./public/font/thumbnail.ttf')
const defaultThumbnailPaths = {
  'image': resolve('./public/img/thumbnails/image.webp'),
  'video': resolve('./public/img/thumbnails/video.webp'),
  'audio': resolve('./public/img/thumbnails/audio.webp'),
  'text': resolve('./public/img/thumbnails/text.webp')
}

// Disable cache to reduce memory usage
sharp.cache(false)

function ffmpegEscapeString (str) {
  // escape ffmpeg special chars
  str = str.replace(/\\/g, '\\\\\\\\')
  str = str.replace(/'/g, '\'\'')
  str = str.replace(/%/g, '\\\\\\%')
  str = str.replace(/:/g, '\\\\\\:')

  return str
}

async function ffmpeg (inputBuffer, type) {
  const args = {
    'video': [ '-r', '1', '-i', 'pipe:0', '-f', 'image2', '-vframes', '1', '-q:v', '1', '-c:v', 'mjpeg', 'pipe:1' ],
    'audio': [ '-i', 'pipe:0', '-f', 'image2', '-q:v', '1', '-c:v', 'mjpeg', 'pipe:1' ],
    'text': [ '-f', 'lavfi', '-i', 'color=c=white:s=250x250:d=5.396', '-filter_complex', `drawtext=text='${ffmpegEscapeString(inputBuffer.toString())}':x=5:y=5:fontsize=16:fontcolor=000000:fontfile='${thumbnailFontPath}'`, '-vframes', '1', '-f', 'image2','-c:v', 'mjpeg', 'pipe:1' ]
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

      if (type !== 'text') Readable.from(inputBuffer).pipe(ffmpegProc.stdin)

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

async function getDefaultThumbnail (type) {
  return readFile(defaultThumbnailPaths[type])
}

export default async function generateThumbnail (mimetype, fileBuffer) {
  const type = mimetypeFilter(mimetype).split('/')[0]

  let imageBuffer

  if (type === 'image') {
    imageBuffer = fileBuffer
  }
  if (type === 'video' || type === 'audio' || type === 'text') {
    imageBuffer = await ffmpeg(fileBuffer, type)
  }

  if (imageBuffer instanceof Buffer === false || imageBuffer.byteLength === 0) return getDefaultThumbnail(type)

  try {
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
      .webp({
        quality: 80
      })
      .toBuffer()
  } catch (err) {
    return getDefaultThumbnail(type)
  }
}
