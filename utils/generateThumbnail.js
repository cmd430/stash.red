import { spawn } from 'node:child_process'
import { MIMEType } from 'node:util'
import { resolve } from 'node:path'
import { createReadStream } from 'node:fs'
import { platform } from 'node:os'
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

function streamToBuffer (readableStream) {
  return new Promise((resolve, reject) => {
    const chunks = []
    readableStream.on('data', data => {
      chunks.push(data instanceof Buffer ? data : Buffer.from(data))
    })
    readableStream.on('end', () => {
      resolve(Buffer.concat(chunks).toString())
    })
    readableStream.on('error', reject)
  })
}

function ffmpegEscapeString (str) {
  // escape ffmpeg special chars
  str = str.replace(/\\/g, '\\\\\\\\')
  str = str.replace(/'/g, '\'\'')
  str = str.replace(/%/g, '\\\\\\%')
  str = str.replace(/:/g, '\\\\\\:')

  return str
}

function ffmpegEscapePath (str) {
  if (platform === 'win32') return str

  // escape ffmpeg special chars
  str = str.replace(/\\/g, '\\\\\\')
  str = str.replace(/:/g, '\\\\:')

  return str
}

async function ffmpeg (inputStream, type) {
  // So we dont do unnessasary processing, text needs to be buffered to generate the thumbnail
  const inputText = type === 'text' ? ffmpegEscapeString(await streamToBuffer(inputStream)) : ''
  const fontPath = ffmpegEscapePath(thumbnailFontPath)
  const args = {
    'video': [ '-hide_banner', '-loglevel', 'error', '-r', '1', '-i', 'pipe:0', '-f', 'image2pipe', '-vframes', '1', '-q:v', '1', '-c:v', 'mjpeg', 'pipe:1' ],
    'audio': [ '-hide_banner', '-loglevel', 'error','-i', 'pipe:0', '-f', 'image2pipe', '-q:v', '1', '-c:v', 'mjpeg', 'pipe:1' ],
    'text': [ '-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'color=c=white:s=250x250:d=5.396', '-filter_complex', `drawtext=text='${inputText}':x=5:y=5:fontsize=18:fontcolor=000000:fontfile='${fontPath}':font=Consolas:line_spacing=5`, '-vframes', '1', '-f', 'image2pipe','-c:v', 'mjpeg', 'pipe:1' ]
  }

  return new Promise((resolve, reject) => {
    const ffmpegProc = spawn(ffmpegBin, args[type])

    // Handle process Errors
    ffmpegProc.on('error', err => {
      error('[FFMPEG Error]', err.message)
      ffmpegProc.kill()
    })

    ffmpegProc.stdin.on('error', err => {
      // we get an EOF error without this error handler but everything is fine,
      // log the error if it is anything else
      if (err.code === 'EOF') return

      error('[FFMPEG stdin Error]', err.message)
      ffmpegProc.kill()
    })

    if (type !== 'text') inputStream.pipe(ffmpegProc.stdin)

    ffmpegProc.stdout.once('readable', () => resolve(ffmpegProc.stdout))
    ffmpegProc.stderr.once('readable', () => reject(new Error('[FFMPEG] Unable to process filestream')))
  })
}

export default async function generateThumbnail (mimetype, filestream) {
  const { type } = new MIMEType(mimetypeFilter(mimetype))

  try {
    const imageStream = type === 'image' ? filestream : await ffmpeg(filestream, type)

    // Resize and crop Thumbnails
    const thumbnailBuffer = sharp()
      .rotate()
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

    return imageStream.pipe(thumbnailBuffer)
  } catch (err) {
    error(err)
  }

  return createReadStream(defaultThumbnailPaths[type])
}
