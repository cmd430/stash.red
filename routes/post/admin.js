import { exit } from 'node:process'
import { Log } from 'cmd430-utils'

// eslint-disable-next-line no-unused-vars
const { log, debug, info, warn, error } = new Log('Admin (POST)')

export default function (fastify, opts, done) {

  fastify.post('/admin/:action', async (request, reply) => {
    if (!request.session.get('authenticated') || request.session.get('session')?.isAdmin !== true) return reply.error(401)

    const { action } = request.params

    if (action === 'restart') return exit(0)
  })

  done()
}

