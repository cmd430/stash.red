/* eslint-disable max-classes-per-file */
import { Readable, Writable, Transform, PassThrough } from 'node:stream'
import { createInterface } from 'node:readline'

export class LimitStream extends Transform {

  #bytesLimit = 0
  #bytesWritten = 0

  constructor ({ maxBytes = 0 }) {
    super()

    this.#bytesLimit = maxBytes ?? 0
    this.limitReached = false
  }

  _transform (chunk, _, cb) {
    this.#bytesWritten += chunk.length

    if (this.#bytesLimit > 0 && this.#bytesWritten > this.#bytesLimit) {
      this.limitReached = true

      return cb()
    }

    this.push(chunk)
    cb()
  }
}

export class BufferableStream extends Writable {

  #chunks = []

  toBuffer () {
    return Buffer.concat(this.#chunks)
  }

  _write (chunk, _, cb) {
    this.#chunks.push(chunk)
    cb()
  }
}

export class ReadLines extends Transform {

  #input = new PassThrough()
  #lines = []
  #asArray = false

  constructor ({ from = 'start', maxLines = 50 }) {
    super()

    createInterface({ input: this.#input, crlfDelay: Infinity })
      .on('line', line => {
        if (from === 'start' && this.#lines.length >= maxLines) return
        if (from === 'end' && this.#lines.length === maxLines) this.#lines.shift()

        this.#lines.push(line)
      })
  }

  _transform (chunk, encoding, cb) {
    this.#input.write(chunk)
    cb()
  }

  _flush (cb) {
    cb(null, this.#lines.join('\n'))
  }
}

export function streamTee (stream) {
  // Get access to the stream with 2 seperate readers
  const [ webStream1, webStream2 ] = Readable.toWeb(stream).tee()
  const nodeStream1 = Readable.fromWeb(webStream1)
  const nodeStream2 = Readable.fromWeb(webStream2)

  return [ nodeStream1, nodeStream2 ]
}

export function streamToBuffer (readableStream) {
  const bufferableStream = new BufferableStream()

  return new Promise((resolve, reject) => {
    readableStream
      .on('error', err => bufferableStream.emit('error', err))
      .pipe(bufferableStream)
      .on('finish', () => resolve(bufferableStream.toBuffer()))
      .on('error', err => reject(err))
  })
}

export async function streamToString (readableStream) {
  const streamBuffer = await streamToBuffer(readableStream)

  return streamBuffer.toString()
}
