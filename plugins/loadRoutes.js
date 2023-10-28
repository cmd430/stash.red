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
    if (!err.status) {
      err.status = 500
      err.message = 'Internal Server Error'
      error(err)
    }

    const errorDescriptions = {
      '400': 'The request cannot be fulfilled',
      '401': 'You do not have permission to view this',
      '403': 'You are forbidden to view this',
      '404': 'The requested page could not be found',
      '500': 'Something has gone wrong processing the request'
    }

    reply
      .code(err.status)
      .view('error', {
        status: err.status,
        message: err.message,
        description: err.description ?? errorDescriptions[err.status] ?? 'An unknown error has occurred',
        stack: err.stack
      })
  })

  // Move on to other handlers
  done()
}
