import { resolve } from 'node:path'
import { Log, isDevEnv } from 'cmd430-utils'
import { customAlphabet } from 'nanoid'
import Fastify from 'fastify'
import serveStatic from '@fastify/static'
import multipart from '@fastify/multipart'
import formbody from '@fastify/formbody'
import cookie from '@fastify/cookie'
import session from '@fastify/session'
import cfTurnstile from 'fastify-cloudflare-turnstile'
import { evaluate } from 'mathjs'
import SqliteStore from 'fastify-session-better-sqlite3-store'
import view from '@fastify/view'
import betterSqlite3 from '@punkish/fastify-better-sqlite3'
import handlebars from 'handlebars'
import { config } from './config/config.js'
import temporaryUploadsGC from './plugins/temporaryUploadsGC.js'
import sessionGC from './plugins/sessionGC.js'
import fastifyLoadHooks from './plugins/fastifyLoadHooks.js'
import loadRoutes from './plugins/loadRoutes.js'
import disableCache from './plugins/disableCache.js'
import databaseConnection from './database/databaseConnection.js'
import fastifyLogger from './helpers/fastifyLogger.js'
import fastifyLoadPartials from './helpers/fastifyLoadPartials.js'
import { getStorageInterface } from './interfaces/storage.js'
import './helpers/handlebarsHelpers.js'

// eslint-disable-next-line no-unused-vars
const { log, debug, info, warn, error } = new Log('Main')
const nanoid = customAlphabet('123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz')
const FileStore = await getStorageInterface(config.storage.store)

try {
  const fastify = Fastify({
    logger: fastifyLogger,
    trustProxy: true,
    ignoreTrailingSlash: true,
    genReqId: () => nanoid(4)
  })

  // Make config accessable as fastify.config
  fastify.decorate('config', config)

  // Make storage accessable as fastify.storage
  fastify.decorate('storage', new FileStore())

  // Fastify Plugins
  fastify.register(cookie)
  fastify.register(session, {
    store: new SqliteStore(databaseConnection),
    secret: config.session.secret,
    cookieName: config.session.cookieName,
    cookie: {
      maxAge: config.session.maxAge,
      secure: isDevEnv() ? 'auto' : true,
      httpOnly: true,
      sameSite: 'strict'
    },
    saveUninitialized: false,
    rolling: true
  })
  fastify.register(serveStatic, {
    root: resolve('./public')
  })
  fastify.register(multipart, {
    limits: {
      fileSize: evaluate(config.uploads.limits.fileSize), // Max file size in bytes
      files: config.uploads.limits.files                  // Max number of file uploads in one go
    }
  })
  fastify.register(formbody)
  fastify.register(cfTurnstile,{
    sitekey: config.captcha.siteKey,
    privatekey: config.captcha.secretKey
  })
  fastify.register(betterSqlite3, databaseConnection)
  fastify.register(view, {
    engine: {
      handlebars: handlebars
    },
    root: resolve('./views'),
    viewExt: 'hbs',
    defaultContext: {
      env: isDevEnv() ? 'dev' : 'prod'
    },
    options: {
      partials: await fastifyLoadPartials(),
      useDataVariables: true
    }
  })
  fastify.register(disableCache)

  // Hooks
  fastify.register(await fastifyLoadHooks)

  // Register routes
  fastify.register(await loadRoutes)

  // Setup Temp file removing and session clean up tasks
  fastify.register(temporaryUploadsGC)
  fastify.register(sessionGC)

  await fastify.listen({
    port: config.fastify.port,
    host: config.fastify.bind
  })

} catch (err) {
  error(err.stack)
  process.exit(1)

}

// Gracefully close the DB on exit
process.on('exit', () => databaseConnection.close())
process.on('SIGHUP', () => process.exit(128 + 1))
process.on('SIGINT', () => process.exit(128 + 2))
process.on('SIGTERM', () => process.exit(128 + 15))
