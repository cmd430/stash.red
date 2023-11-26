import { MIMEType } from 'node:util'
import { WASMagic } from 'wasmagic'
import { Log } from 'cmd430-utils'
import streamHead from 'stream-head'
import mime from 'mime'

// eslint-disable-next-line no-unused-vars
const { log, debug, info, warn, error } = new Log('Mimetype')
const magic = await WASMagic.create()
const { getExtension } = mime

export function mimetypeFilter (mimetype) {
  // Fix some mimetypes
  const mimetypeMap = {
    'video/x-matroska': 'video/webm',
    'application/javascript': 'text/javascript',
    'application/json': 'text/json'
  }

  return mimetypeMap[mimetype] ?? mimetype
}

export function isValidMimetype (mimetype) {
  const { type } = new MIMEType(mimetypeFilter(mimetype))
  const allowedTypes = [
    'image',
    'video',
    'audio',
    'text'
  ]

  return allowedTypes.includes(type)
}

export async function getMimetype (filestream) {
  try {
    const KB = 1024

    let lastSearchBytes = 0
    let searchBytes = KB
    let mimetype = 'invalid/mimetype'
    let isDetected = false
    let returnStream

    // Keep looking for a valid mimetype until we run out of new bytes
    // Generally we should only need the first 1KB or less
    while (isDetected === false && searchBytes > lastSearchBytes) {
      const { head, stream } = await streamHead(filestream, {
        bytes: searchBytes
      })

      mimetype = magic.getMime(head)
      returnStream = stream

      if (mimetype !== 'application/octet-stream') {
        isDetected = true
      } else {
        lastSearchBytes = searchBytes
        searchBytes += KB
      }
    }

    return {
      stream: returnStream,
      mimetype: mimetype
    }
  } catch (err) {
    error(err)

    return {
      stream: filestream,
      mimetype: 'invalid/mimetype'
    }
  }
}

export function getMimeExtension (mimetype) {
  const { type } = new MIMEType(mimetypeFilter(mimetype))

  return `.${getExtension(mimetype) ?? type}`
}
