import { Log } from 'cmd430-utils'

// eslint-disable-next-line no-unused-vars
const { log, debug, info, warn, error } = new Log('Home')

export default function (fastify, opts, done) {

  // Home page
  fastify.get('/', async (request, reply) => {

    // TEMP
    debug('authenticated: ', request.session.get('authenticated') ?? false)
    debug(request.session.get('session') ?? {})

    return reply
      .disableCache()
      .view('home')
  })

  done()
}
