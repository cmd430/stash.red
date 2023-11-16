import { randomUUID } from 'node:crypto'
import { hash, compare } from 'bcrypt'
import createError from 'http-errors'
import { Log } from 'cmd430-utils'

// eslint-disable-next-line no-unused-vars
const { log, debug, info, warn, error } = new Log('Account (POST)')

export default function (fastify, opts, done) {
  const { site, bcrypt } = fastify.config

  // Signup
  fastify.post('/signup', { preHandler: fastify.cfTurnstile }, async (request, reply) => {
    if (site.allowSignups === false) return createError(403, 'Account creation is disabled')

    const { username, email, password, confirm } = request.body
    const userameValid = Boolean((/^[a-zA-Z0-9]{3,63}$/).test(username))

    if (password !== confirm || !username || !email || !userameValid) return createError(400, password !== confirm ? 'Passwords do not match' : 'All Fields Required')

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

      return createError(500, 'Internal Server Error')
    }
  })

  // Login
  fastify.post('/login', { preHandler: fastify.cfTurnstile }, async (request, reply) => {
    const { username, password } = request.body

    if (!username || !password) return createError(400, 'All Fields Required')

    try {
      const { id, password: passwordHash, isAdmin } = await fastify.db.getAccount(username)
      const hasValidCredentials = await compare(password, passwordHash)

      if (hasValidCredentials === false) return createError(401, 'Invalid username or password')

      request.session.set('authenticated', true)
      request.session.set('session', {
        id: id,
        username: username,
        isAdmin: isAdmin
      })

      return reply.redirect('/')
    } catch (err) {
      error(err.stack)

      return createError(500)
    }
  })

  done()
}
