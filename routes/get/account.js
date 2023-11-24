import { Log } from 'cmd430-utils'

// eslint-disable-next-line no-unused-vars
const { log, debug, info, warn, error } = new Log('Account (GET)')

export default function (fastify, opts, done) {

  const { captcha, site, render: { siteTitle } } = fastify.config

  // Signup page
  fastify.get('/signup', async (request, reply) => {
    if (request.session.get('authenticated')) return reply.redirect('/')
    if (site.allowSignups === false) return reply.error(403, 'Account creation is disabled')

    return reply
      .disableCache()
      .view('signup', {
        captcha: captcha.siteKey
      })
  })

  // Enable 2FA
  fastify.get('/enable-2fa', async (request, reply) => {
    if (!request.session.get('authenticated')) return reply.error(403)

    const { username } = request.session.get('session')
    const { totpSecret: enabled } = await fastify.db.getAccount(username)

    if (enabled) return reply.error(409, '2FA is already enabled for this account')

    const secret = fastify.totp.generateSecret()
    const QRCode = await fastify.totp.generateQRCode({
      secret: secret.ascii,
      label: siteTitle
    })

    request.session.set('2FASecret', secret.ascii)

    return reply
      .disableCache()
      .view('2fa', {
        QRCode: QRCode,
        code: secret.base32,
        url: secret.otpauth_url
      })
  })

  // Login page
  fastify.get('/login', async (request, reply) => {
    if (request.session.get('authenticated')) return reply.redirect('/')

    return reply
      .disableCache()
      .view('login', {
        captcha: captcha.siteKey
      })
  })

  // 2FA page
  fastify.get('/2fa', async (request, reply) => {
    if (request.session.get('authenticated') || request.session.get('session') === undefined) return reply.redirect('/')

    return reply
      .disableCache()
      .view('2fa')
  })

  // Logout
  fastify.get('/logout', async (request, reply) => {
    if (!request.session.get('authenticated')) return reply.redirect('/')

    try {
      await request.session.destroy()

      return reply.redirect('/')
    } catch (err) {
      error(err.stack)

      return reply.error(500)
    }
  })

  done()
}
