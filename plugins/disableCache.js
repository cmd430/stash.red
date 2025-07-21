import { fastifyPlugin } from 'fastify-plugin'
import { Log } from 'cmd430-utils'

// eslint-disable-next-line no-unused-vars
const { log, debug, info, warn, error } = new Log('Disable Cache')

export default fastifyPlugin(async (fastify, opts) => {
  fastify.decorateReply('disableCache', function () {
    // eslint-disable-next-line no-invalid-this
    return this
      .header('Cache-Control', 'max-age=0, no-cache, no-store, must-revalidate')
      .header('Pragma', 'no-cache')
      .header('Expires', 0)
  })
}, {
  fastify: '5.x',
  name: 'disable-cache'
})
