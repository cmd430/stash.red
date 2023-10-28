import { Log } from 'cmd430-utils'

// eslint-disable-next-line no-unused-vars
const { log, debug, info, warn, error } = new Log('Home')

export default function (fastify, opts, done) {

  // Home page
  fastify.get('/', async (req, reply) => {

    // TEMP
    debug('authenticated: ', req.session.get('authenticated') ?? false)
    debug(req.session.get('session') ?? {})

    return reply.view('home')
  })

  done()
}
