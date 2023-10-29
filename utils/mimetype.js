import { WASMagic } from 'wasmagic'
import { Log } from 'cmd430-utils'

// eslint-disable-next-line no-unused-vars
const { log, debug, info, warn, error } = new Log('Mimetype')
const magic = await WASMagic.create()

export function mimetypeFilter (mimetype) {
  // Fix some mimetypes
  const mimetypeMap = {
    'video/x-matroska': 'video/webm',
    'application/javascript': 'text/javascript'
  }

  return mimetypeMap[mimetype] ?? mimetype
}


export function isValidMimetype (mimetype) {
  const type = mimetypeFilter(mimetype).split('/')[0]
  const allowedTypes = [
    'image',
    'video',
    'audio',
    'text'
  ]

  return allowedTypes.includes(type)
}

export function getMimetype (fileBuffer) {
  try {
    // Only looking at the first KB
    const firstKB = fileBuffer.subarray(0, 1024)

    return magic.getMime(firstKB)
  } catch (err) {
    error(err.stack)
    return 'invalid/mimetype'
  }
}