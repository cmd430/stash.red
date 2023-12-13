import { fastifyPlugin } from 'fastify-plugin'
import { Log } from 'cmd430-utils'

// eslint-disable-next-line no-unused-vars
const { log, debug, info, warn, error } = new Log('Abort')

export default fastifyPlugin(async (fastify, opts, done) => {
  // Find and register hooks

  fastify.decorateRequest('signal', null)
  fastify.addHook('onRequest', (request, reply, done) => {
    const abortControler = new AbortController()

    request.raw.once('close', () => {
      if (!request.raw.aborted) return

      abortControler.abort()
    })

    request.signal = abortControler.signal

    done()
  })

  done()
}, {
  fastify: '4.x',
  name: 'abort'
})
