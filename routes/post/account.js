import { hash, compare } from 'bcrypt'
import createError from 'http-errors'
import { Log } from 'cmd430-utils'
import { createAzureContainer } from '../../utils/azureBlob.js'

// eslint-disable-next-line no-unused-vars
const { log, debug, info, warn, error } = new Log('Account (POST)')

// TODO: make safe and not shit

export default function (fastify, opts, done) {

  const { bcrypt } = fastify.config

  // Signup
  fastify.post('/signup', async (req, reply) => {
    const { username, email, password, confirm } = req.body
    const userameValid = Boolean((/^[a-zA-Z0-9]{3,63}$/).test(username))

    if (password !== confirm || !username || !email || !userameValid) {
      reply.code(400)
      return createError(400, password !== confirm ? 'Passwords do not match' : 'All Fields Required')
    }

    try {
      const { _id } = fastify.betterSqlite3
        .prepare('INSERT INTO accounts (username, email, password) VALUES (?, ?, ?)')
        .run(username, email, await hash(password, bcrypt.rounds))

      await createAzureContainer(username)

      req.session.authenticated = true
      req.session.user = {
        id: _id,
        username: username
      }

      reply.redirect('/')
    } catch (err) {
      error(err)

      reply.code(500)
      return createError(500, 'Internal Server Error')
    }
  })

  // Login
  fastify.post('/login', async (req, reply) => {
    const { username, password } = req.body

    if (!username || !password) {
      reply.code(400)
      return createError(400, 'All Fields Required')
    }

    try {
      const { _id, password: passwordHash } = fastify.betterSqlite3
        .prepare('SELECT _id, password FROM accounts WHERE username = ?')
        .get(username)

      const hasValidCredentials = await compare(password, passwordHash)

      if (hasValidCredentials === false) {
        reply.code(401)
        return createError(401, 'Invalid username or password')
      }

      req.session.authenticated = true
      req.session.user = {
        id: _id,
        username: username
      }

      reply.redirect('/')
    } catch (err) {
      error(err)

      reply.code(500)
      return createError(500, 'Internal Server Error')
    }
  })

  done()
}
