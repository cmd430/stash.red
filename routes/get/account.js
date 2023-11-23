import createError from 'http-errors'
import { Log } from 'cmd430-utils'

// eslint-disable-next-line no-unused-vars
const { log, debug, info, warn, error } = new Log('Account (GET)')

export default function (fastify, opts, done) {

  const { captcha, site, render: { siteTitle } } = fastify.config

  // Signup page
  fastify.get('/signup', async (request, reply) => {
    if (request.session.get('authenticated')) return reply.redirect('/')
    if (site.allowSignups === false) return createError(403, 'Account creation is disabled')

    return reply.view('signup', {
      captcha: captcha.siteKey
    })
  })

  // Enable 2FA
  fastify.get('/enable2fa', async (request, reply) => {
    if (!request.session.get('authenticated')) return createError(403)

    const { ascii: secret } = fastify.totp.generateSecret()
    const qrcode = await fastify.totp.generateQRCode({
      secret: secret,
      label: siteTitle
    })
    const { username } = request.session.get('session')
    const enabled = await fastify.db.enable2FA(username, secret)

    if (!enabled) return reply.error(409, '2FA is already enabled for this account')

    return reply
      .type('image/png')
      .send(Buffer.from(qrcode.slice(21), 'base64'))
  })

  // Login page
  fastify.get('/login', async (request, reply) => {
    if (request.session.get('authenticated')) return reply.redirect('/')

    return reply.view('login', {
      captcha: captcha.siteKey
    })
  })

  // 2FA page
  fastify.get('/2fa', async (request, reply) => {
    if (request.session.get('authenticated') || request.session.get('session') === undefined) return reply.redirect('/')

    return reply.view('2fa')
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
