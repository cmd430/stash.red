import { Log } from 'cmd430-utils'

// eslint-disable-next-line no-unused-vars
const { log, debug, info, warn, error } = new Log('Home')

export default function (fastify, opts, done) {

  // Home page
  fastify.get('/', async (req, reply) => {
    return reply.view('index')
  })

  done()
}
