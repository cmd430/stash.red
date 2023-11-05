import { fastifyPlugin } from 'fastify-plugin'

export default fastifyPlugin((fastify, opts, done) => {
  fastify.decorateReply('disableCache', function () {
    /* eslint-disable no-invalid-this */

    return this
      .header('Cache-Control', 'max-age=0, no-cache, no-store, must-revalidate')
      .header('Pragma', 'no-cache')
      .header('Expires', 0)

    /* eslint-enable no-invalid-this */
  })

  // Move on to other handlers
  done()
}, {
  fastify: '4.x',
  name: 'disable-cache'
})
