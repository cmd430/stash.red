import { WASMagic } from 'wasmagic'
import { Log } from 'cmd430-utils'

// eslint-disable-next-line no-unused-vars
const { log, debug, info, warn, error } = new Log('Mimetype')
const magic = await WASMagic.create()

export function isValidMimetype (mimeFromBrowser, fileBuffer) {
  try {
    const typeFromBrowser = mimeFromBrowser.split('/')[0]
    const allowedTypes = [
      'image',
      'video',
      'audio',
      'text'
    ]

    if (allowedTypes.includes(typeFromBrowser) === false) return false

    const firstKB = fileBuffer.subarray(0, 1024) // We can speed up processing by only looking at the first KB
    const mimeFromMagic = magic.getMime(firstKB)
    const typeFromMagic = mimeFromMagic.split('/')[0]

    return allowedTypes.includes(typeFromMagic)
  } catch (err) {
    error(err)

    return false
  }
}

export function mimetypeFilter (mimetype) {
  // Fix some mimetypes downloading, might be a better way to handle
  const mimetypeMap = {
    'video/x-matroska': 'video/webm'
  }

  return mimetypeMap[mimetype] ?? mimetype
}
