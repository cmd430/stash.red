import { readdir } from 'node:fs/promises'
import { basename } from 'node:path'
import { Log, __dirname, __filename } from 'cmd430-utils'

// eslint-disable-next-line no-unused-vars
const { log, debug, info, warn, error } = new Log('Routes')

export default async function routes (fastify, opts, done) {
  // Find and register routes
  for (const file of await readdir(__dirname(), { recursive: true })) {
    if (!file.endsWith('.js') || file === basename(__filename())) continue

    fastify.register(await import(`./${file}`))
  }

  // Error handling
  fastify.setErrorHandler((err, req, reply) => {
    if (!err.status) return reply.send(err)

    // TODO: remove stack trace if prod mode
    err.code = err.status
    reply.view('error', err)
  })

  // Move on to other handlers
  done()
}
