import { readdir } from 'node:fs/promises'
import { Log } from 'cmd430-utils'

// eslint-disable-next-line no-unused-vars
const { log, debug, info, warn, error } = new Log('Routes')

export default async function loadRoutes (fastify, opts, done) {
  // Find and register routes
  for (const file of await readdir('./routes', { recursive: true })) {
    if (!file.endsWith('.js')) continue

    fastify.register(await import(`../routes/${file}`))
  }

  // Error handling
  fastify.setErrorHandler((err, req, reply) => {
    if (!err.status) return (
      reply
        .code(500)
        .send(err)
    )

    // TODO: remove stack trace if prod mode

    reply
      .code(err.code)
      .view('error', err)
  })

  // Move on to other handlers
  done()
}
