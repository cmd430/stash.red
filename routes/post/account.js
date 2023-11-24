import { randomUUID } from 'node:crypto'
import { hash, compare } from 'bcrypt'
import { Log } from 'cmd430-utils'

// eslint-disable-next-line no-unused-vars
const { log, debug, info, warn, error } = new Log('Account (POST)')

export default function (fastify, opts, done) {
  const { site, bcrypt } = fastify.config

  // Signup
  fastify.post('/signup', { preHandler: fastify.cfTurnstile }, async (request, reply) => {
    if (request.session.get('authenticated')) return reply.redirect('/')
    if (site.allowSignups === false) return reply.error(403, 'Account creation is disabled')

    const { username, email, password, confirm } = request.body
    const userameValid = Boolean((/^[a-zA-Z0-9]{3,63}$/).test(username))

    if (password !== confirm || !username || !email || !userameValid) return reply.error(400, password !== confirm ? 'Passwords do not match' : 'All Fields Required')

    try {
      const id = randomUUID()
      const passwordHash = await hash(password, bcrypt.rounds)

      await fastify.db.createAccount({
        id: id,
        username: username,
        email: email,
        password: passwordHash
      })

      await fastify.storage.createContainer(username)

      request.session.set('authenticated', true)
      request.session.set('session', {
        id: id,
        username: username,
        isAdmin: false
      })

      return reply.redirect('/')
    } catch (err) {
      error(err.stack)

      return reply.error(500)
    }
  })

  // Enable 2FA
  fastify.post('/verify-enable', async (request, reply) => {
    if (!request.session.get('authenticated') || request.session.get('session') === undefined || request.session.get('2FASecret') === undefined) return reply.redirect('/')

    const { token } = request.body
    const { username } = request.session.get('session')
    const secret = request.session.get('2FASecret')

    request.session.set('2FASecret', undefined)

    if (!token) return reply.error(400, 'Missing 2FA token')

    try {
      const hasValidTotp = request.totpVerify({
        secret: secret,
        token: token
      })

      if (!hasValidTotp) return reply.error(401, 'Invalid 2FA token')
      if (await fastify.db.enable2FA(username, secret)) return reply.redirect('/')

      return reply.error(500, 'Unable to enable 2FA')
    } catch (err) {
      error(err.stack)

      return reply.error(500)
    }
  })

  // Login
  fastify.post('/login', { preHandler: fastify.cfTurnstile }, async (request, reply) => {
    if (request.session.get('authenticated')) return reply.redirect('/')

    const { username, password } = request.body

    try {
      const { id, password: passwordHash, secret, isAdmin } = await fastify.db.getAccount(username)

      if (!username || !password) return reply.error(400, 'All Fields Required')

      const hasValidCredentials = await compare(password, passwordHash)

      if (hasValidCredentials === false) return reply.error(401, 'Invalid username or password')

      request.session.set('session', {
        id: id,
        username: username,
        isAdmin: isAdmin
      })

      if (secret) return reply.redirect('/2fa')

      request.session.set('authenticated', true)

      return reply.redirect('/')
    } catch (err) {
      error(err.stack)

      return reply.error(500)
    }
  })

  // Login 2FA
  fastify.post('/verify', async (request, reply) => {
    if (request.session.get('authenticated') || request.session.get('session') === undefined) return reply.redirect('/')

    const { token } = request.body
    const { username } = request.session.get('session')

    if (!username) return reply.redirect('/login')
    if (!token) return reply.error(400, 'Missing 2FA token')

    try {
      const { secret } = await fastify.db.getAccount(username)
      const hasValidTotp = secret ? request.totpVerify({
        secret: secret,
        token: token
      }) : true

      request.session.set('authenticated', true)

      if (hasValidTotp) return reply.redirect('/')

      request.session.destroy()

      return reply.error(401, 'Invalid 2FA token')
    } catch (err) {
      error(err.stack)

      return reply.error(500)
    }
  })

  done()
}
