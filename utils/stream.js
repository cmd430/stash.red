import { Readable, Transform } from 'node:stream'

export function streamTee (stream) {
  // Get access to the stream with 2 seperate readers
  const [ webStream1, webStream2 ] = Readable.toWeb(stream).tee()
  const nodeStream1 = Readable.fromWeb(webStream1)
  const nodeStream2 = Readable.fromWeb(webStream2)

  return [ nodeStream1, nodeStream2 ]
}

export class LimitStream extends Transform {

  #bytesLimit = 0
  #bytesWritten = 0

  constructor (limit) {
    super()

    this.#bytesLimit = limit ?? 0
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
