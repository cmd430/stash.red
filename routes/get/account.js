import createError from 'http-errors'
import { Log } from 'cmd430-utils'

// eslint-disable-next-line no-unused-vars
const { log, debug, info, warn, error } = new Log('Account (GET)')

export default function (fastify, opts, done) {

  // Signup page
  fastify.get('/signup', async (req, reply) => {
    return reply.view('signup')
  })

  // Login page
  fastify.get('/login', async (req, reply) => {
    if (req.session.get('authenticated')) return reply.redirect('/')

    return reply.view('login')
  })

  // Logout
  fastify.get('/logout', async (req, reply) => {
    if (!req.session.get('authenticated')) return reply.redirect('/')

    try {
      await req.session.destroy()

      return reply.redirect('/')
    } catch (err) {
      error(err)

      return createError(500)
    }
  })

  done()
}
