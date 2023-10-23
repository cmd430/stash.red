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
    return reply.view('login')
  })

  // Logout
  fastify.get('/logout', (req, reply) => {
    if (req.session.authenticated) {
      req.session.destroy(err => {
        if (err) {
          reply.code(500)
          return createError(500, 'Internal Server Error')
        } else {
          reply.redirect('/')
        }
      })
    } else {
      reply.redirect('/')
    }
  })

  done()
}
