import createError from 'http-errors'
import { Log } from 'cmd430-utils'

// eslint-disable-next-line no-unused-vars
const { log, debug, info, warn, error } = new Log('Account (GET)')

export default function (fastify, opts, done) {

  const captcha = fastify.config.captcha

  // Signup page
  fastify.get('/signup', async (request, reply) => {
    if (request.session.get('authenticated')) return reply.redirect('/')

    return reply.view('signup', {
      captcha: captcha.siteKey
    })
  })

  // Login page
  fastify.get('/login', async (request, reply) => {
    if (request.session.get('authenticated')) return reply.redirect('/')

    return reply.view('login', {
      captcha: captcha.siteKey
    })
  })

  // Logout
  fastify.get('/logout', async (request, reply) => {
    if (!request.session.get('authenticated')) return reply.redirect('/')

    try {
      await request.session.destroy()

      return reply.redirect('/')
    } catch (err) {
      error(err.stack)

      return createError(500)
    }
  })

  done()
}
