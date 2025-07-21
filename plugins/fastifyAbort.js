import { fastifyPlugin } from 'fastify-plugin'
import { Log } from 'cmd430-utils'

// eslint-disable-next-line no-unused-vars
const { log, debug, info, warn, error } = new Log('Abort')

export default fastifyPlugin(async (fastify, opts) => {
  // Find and register hooks

  fastify.decorateRequest('signal', null)
  fastify.addHook('onRequest', async (request, reply) => {
    const abortControler = new AbortController()

    request.raw.once('close', () => {
      if (!request.raw.aborted) return

      abortControler.abort()
    })

    request.signal = abortControler.signal
  })
}, {
  fastify: '5.x',
  name: 'abort'
})
