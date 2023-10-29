import { WASMagic } from 'wasmagic'
import { Log } from 'cmd430-utils'

// eslint-disable-next-line no-unused-vars
const { log, debug, info, warn, error } = new Log('Mimetype')
const magic = await WASMagic.create()

export function isValidMimetype (mimetype) {
  const type = mimetype.split('/')[0]
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
    error(err)
    return 'invalid/mimetype'
  }
}

export function mimetypeFilter (mimetype) {
  // Fix some mimetypes downloading, might be a better way to handle
  const mimetypeMap = {
    'video/x-matroska': 'video/webm'
  }

  return mimetypeMap[mimetype] ?? mimetype
}
