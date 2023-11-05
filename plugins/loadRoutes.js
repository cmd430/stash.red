import { readdir } from 'node:fs/promises'
import { Log } from 'cmd430-utils'
import createError from 'http-errors'

// eslint-disable-next-line no-unused-vars
const { log, debug, info, warn, error } = new Log('Routes')

function handleError (err, request, reply) {
  if (!err.status && err.statusCode) err.status = err.statusCode
  if (!err.status) {
    err.status = 500
    err.message = 'Internal Server Error'
    error(err.stack)
  }

  const errorDescriptions = {
    '400': 'The request cannot be fulfilled',
    '401': 'You do not have permission for this',
    '403': 'You are forbidden to from this',
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
}

export default async function loadRoutes (fastify, opts, done) {
  // Find and register routes
  for (const file of await readdir('./routes', { recursive: true })) {
    if (!file.endsWith('.js')) continue

    fastify.register(await import(`../routes/${file}`))
  }

  // Error handling
  fastify.setNotFoundHandler((request, reply) => handleError(createError(404), request, reply))
  fastify.setErrorHandler((err, request, reply) => handleError(err, request, reply))

  // Move on to other handlers
  done()
}
