import { resolve } from 'node:path'
import { Log } from 'cmd430-utils'
import { customAlphabet } from 'nanoid'
import Fastify from 'fastify'
import serveStatic from '@fastify/static'
import multipart from '@fastify/multipart'
import formbody from '@fastify/formbody'
import cookie from '@fastify/cookie'
import session from '@fastify/session'
import SqliteStore from 'fastify-session-better-sqlite3-store'
import view from '@fastify/view'
import betterSqlite3 from '@punkish/fastify-better-sqlite3'
import handlebars from 'handlebars'
import { config } from './utils/config.js'
import temporaryUploadsGC from './plugins/temporaryUploadsGC.js'
import databaseConnection from './utils/databaseConnection.js'
import fastifyLogger from './utils/fastifyLogger.js'
import routes from './routes/routes.js'

// eslint-disable-next-line no-unused-vars
const { log, debug, info, warn, error } = new Log('Main')
const nanoid = customAlphabet('123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz')

try {
  const fastify = Fastify({
    logger: fastifyLogger,
    trustProxy: true,
    genReqId: () => nanoid(4)
  })

  // Make config accessable as fastify.config
  fastify.decorate('config', config)

  // Fastify Plugins
  fastify.register(cookie)
  fastify.register(session, {
    store: new SqliteStore(databaseConnection),
    secret: config.session.secret,
    cookieName: config.session.cookieName,
    cookie: {
      maxAge: config.session.maxAge,
      secure: true,
      httpOnly: true,
      sameSite: 'strict'
    }
  })
  fastify.register(serveStatic, {
    root: resolve('./public')
  })
  fastify.register(multipart, {
    limits: {
      fileSize: 499 * 1000 * 1000,  // Max file size in bytes
      files: 100                    // Max number of file uploads in one go
    }
  })
  fastify.register(formbody)
  fastify.register(betterSqlite3, databaseConnection)
  fastify.register(view, {
    engine: {
      handlebars: handlebars
    },
    root: resolve('./views'),
    viewExt: 'hbs',
    partials: {},
    options: {
      useDataVariables: true
    }
  })

  // Register routes
  fastify.register(await routes)

  // Setup Temp file removing task
  fastify.register(temporaryUploadsGC)

  await fastify.listen({
    port: 8080,
    host: '::'
  })

} catch (err) {

  error(err)
  process.exit(1)

}
