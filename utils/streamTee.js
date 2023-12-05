import { Readable } from 'node:stream'

export function streamTee (stream) {
  // Get access to the stream with 2 seperate readers
  const [ webStream1, webStream2 ] = Readable.toWeb(stream).tee()
  const nodeStream1 = Readable.fromWeb(webStream1)
  const nodeStream2 = Readable.fromWeb(webStream2)

  return [ nodeStream1, nodeStream2 ]
}
