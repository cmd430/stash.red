import { fastifyPlugin } from 'fastify-plugin'
import { Log } from 'cmd430-utils'

// eslint-disable-next-line no-unused-vars
const { log, debug, info, warn, error } = new Log('Disable Cache')

export default fastifyPlugin((fastify, opts, done) => {
  fastify.decorateReply('disableCache', function () {
    // eslint-disable-next-line no-invalid-this
    return this
      .header('Cache-Control', 'max-age=0, no-cache, no-store, must-revalidate')
      .header('Pragma', 'no-cache')
      .header('Expires', 0)
  })

  // Move on to other handlers
  done()
}, {
  fastify: '4.x',
  name: 'disable-cache'
})
