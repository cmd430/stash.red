import { spawn } from 'node:child_process'
import { MIMEType } from 'node:util'
import { resolve } from 'node:path'
import { createReadStream, createWriteStream } from 'node:fs'
import { pipeline } from 'node:stream/promises'
import { platform } from 'node:os'
import ffmpegPath from 'ffmpeg-static'
import { file as TempFile } from 'tmp-promise'
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

function ffEscapeString (str) {
  // escape ffmpeg special chars
  str = str.replace(/\\/g, '\\\\\\\\')
  str = str.replace(/'/g, '\'\'')
  str = str.replace(/%/g, '\\\\\\%')
  str = str.replace(/:/g, '\\\\\\:')

  return str
}

function ffEscapePath (str) {
  if (platform === 'win32') return str

  // escape ffmpeg special chars
  str = str.replace(/\\/g, '\\\\\\')
  str = str.replace(/:/g, '\\\\:')

  return str
}

function requiresTemp (subtype) {
  const subtypes = [ // subtypes in here cant be piped into ffmpeg under most situations
    'mp4'
  ]

  return subtypes.includes(subtype)
}

async function ffmpeg (inputStream, mimetype) {
  const { type, subtype } = mimetype
  const tempFile = requiresTemp(subtype) ? await TempFile() : undefined
  // So we dont do unnessasary processing, text needs to be buffered to generate the thumbnail
  const inputText = type === 'text' ? ffEscapeString(await streamToBuffer(inputStream)) : ''
  const fontPath = ffEscapePath(thumbnailFontPath)
  const ffmpegArgs = [ '-hide_banner', '-loglevel', 'error' ]
  const inputArgs = {
    'video': [ '-i', 'pipe:0', '-vf', 'blackframe=0,metadata=select:key=lavfi.blackframe.pblack:value=80:function=less' ],
    'audio': [ '-i', 'pipe:0' ],
    'text': [ '-f', 'lavfi', '-i', 'color=c=white:s=250x250:d=5.396', '-filter_complex', `drawtext=text='${inputText}':x=5:y=5:fontsize=18:fontcolor=000000:fontfile='${fontPath}':font=Consolas:line_spacing=5` ]
  }
  const outputArgs = [ '-frames:v', '1', '-f', 'image2pipe', '-q:v', '1', '-c:v', 'mjpeg', 'pipe:1' ]
  const args = ffmpegArgs.concat(inputArgs[type]).concat(outputArgs)

  if (requiresTemp) {
    // replace the pipe:0 input with the path to our temp file
    args[args.indexOf('pipe:0')] = tempFile.path

    // wait for the temp file to be written
    try {
      await pipeline(inputStream, createWriteStream(tempFile.path))
    } catch {}
  }

  debug('ffmpeg args:', args.join(' '))

  return new Promise((resolve, reject) => {
    const ffProcess = spawn(ffmpegPath, args)

    // Handle process Errors
    ffProcess.on('error', err => reject(err))
    ffProcess.stdin.on('error', err => {
      // we get an EOF error without this error handler but everything is fine,
      // we also get an EPIPE for some videos because it doesnt need all the inputstream, we can also ignore these
      // we log the error if it is anything else
      if (err.code !== 'EOF' && err.code !== 'EPIPE') return error('[FFMPEG stdin Error]', err.message)
    })
    ffProcess.on('exit', () => tempFile?.cleanup())

    if (type !== 'text') ffProcess.once('spawn', () => inputStream.pipe(ffProcess.stdin))

    ffProcess.stdout.once('readable', () => resolve(ffProcess.stdout))
    ffProcess.stderr.once('readable', () => reject(new Error('[FFMPEG] Unable to process filestream')))
  })
}

export async function generateThumbnail (mimetype, filestream) {
  const mime = new MIMEType(mimetypeFilter(mimetype))
  const { type } = mime

  try {
    const imageStream = type === 'image' ? filestream : await ffmpeg(filestream, mime)

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
      .once('error', err => error(err))

    return imageStream.pipe(thumbnailBuffer)
  } catch (err) {
    error(err)
  }

  return createReadStream(defaultThumbnailPaths[type])
}
