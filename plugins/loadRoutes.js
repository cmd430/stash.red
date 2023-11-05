import { readdir } from 'node:fs/promises'
import { Log } from 'cmd430-utils'
import createError from 'http-errors'
import { fastifyPlugin } from 'fastify-plugin'
import errorHandler from '../utils/errorHandler.js'

// eslint-disable-next-line no-unused-vars
const { log, debug, info, warn, error } = new Log('Routes')

export default fastifyPlugin(async (fastify, opts, done) => {
  // Find and register routes
  for (const file of await readdir('./routes', { recursive: true })) {
    if (!file.endsWith('.js')) continue

    fastify.register(await import(`../routes/${file}`))
  }

  // Error handling
  fastify.setNotFoundHandler((request, reply) => errorHandler(createError(404), request, reply))
  fastify.setErrorHandler((err, request, reply) => errorHandler(err, request, reply))

  // Move on to other handlers
  done()
}, {
  fastify: '4.x',
  name: 'load-routes'
})
