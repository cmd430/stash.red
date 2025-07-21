import { readdir } from 'node:fs/promises'
import { Log } from 'cmd430-utils'
import { fastifyPlugin } from 'fastify-plugin'

// eslint-disable-next-line no-unused-vars
const { log, debug, info, warn, error } = new Log('Routes')

export default fastifyPlugin(async (fastify, opts) => {
  // Find and register routes
  for (const file of await readdir('./routes', { recursive: true })) {
    if (!file.endsWith('.js')) continue

    fastify.register(await import(`../routes/${file}`))
  }

  // Error handling
  fastify.setNotFoundHandler((request, reply) => reply.error(404))
  fastify.setErrorHandler((err, request, reply) => reply.error(err))
}, {
  fastify: '5.x',
  name: 'load-routes'
})
