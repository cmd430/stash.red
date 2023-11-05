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
    const KB = 1024

    /*
      if the filebuffer is >= than KB we start looking at KB
      if the filebuffer is < than KB we look at the entire filebuffer

      if we dont get a valid mime keep checking more of the filebuffer to confirm
    */
    let searchBytes = fileBuffer.byteLength >= KB ? KB : fileBuffer.byteLength
    let mimetype = 'invalid/mimetype'
    let found = false

    while (found === false && searchBytes <= fileBuffer.byteLength) {
      mimetype = magic.getMime(fileBuffer.subarray(0, searchBytes))

      if (mimetype !== 'application/octet-stream' || searchBytes === fileBuffer.byteLength) {
        // we either found a mimetype or we run out of filebuffer to search
        found = true
      } else {
        if (searchBytes + KB > fileBuffer.byteLength) {
          // add the last bytes to search
          searchBytes += fileBuffer.byteLength - searchBytes
        } else if (searchBytes + KB <= fileBuffer.byteLength) {
          // add additional KB to search
          searchBytes += KB
        }
      }
    }

    return mimetype
  } catch (err) {
    error(err.stack)
    return 'invalid/mimetype'
  }
}
