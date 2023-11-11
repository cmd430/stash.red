import { get } from 'node:https'
import { Log } from 'cmd430-utils'

// eslint-disable-next-line no-unused-vars
const { log, debug, info, warn, error } = new Log('Fetch External')

export async function grab (url) {
  debug('Fetching data from remote URL', url)

  return new Promise((resolve, reject) => {
    const chunks = []

    get(url, res => {
      res.on('data', chunk => {
        chunks.push(chunk instanceof Buffer ? chunk : Buffer.from(chunk))
      })
      res.on('end', () => resolve(Buffer.concat(chunks)))
    }).on('error', err => reject(err))
  })
}
