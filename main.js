import process from 'node:process'
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
import totp from 'fastify-totp'
import websocket from '@fastify/websocket'
import handlebars from 'handlebars'
import { config } from './config/config.js'
import { sessions } from './sessions/sessions.js'
import temporaryUploadsGC from './plugins/temporaryUploadsGC.js'
import fastifyLoadHooks from './plugins/fastifyLoadHooks.js'
import loadRoutes from './plugins/loadRoutes.js'
import disableCache from './plugins/disableCache.js'
import errorPage from './plugins/errorPage.js'
import fastifyLogger from './helpers/fastifyLogger.js'
import fastifyLoadPartials from './helpers/fastifyLoadPartials.js'
import { getDatabaseInterface } from './interfaces/database.js'
import { getStorageInterface } from './interfaces/storage.js'
import './helpers/handlebarsHelpers.js'

// eslint-disable-next-line no-unused-vars
const { log, debug, info, warn, error } = new Log('Main')
const nanoid = customAlphabet('123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz')
const DataStore = await getDatabaseInterface(config.database.store)
const FileStore = await getStorageInterface(config.storage.store)

process.on('warning', warning => warn(warning.stack))

try {
  const fastify = Fastify({
    logger: fastifyLogger,
    trustProxy: true,
    ignoreTrailingSlash: true,
    genReqId: () => nanoid(4)
  })

  // Make config accessable as fastify.config
  fastify.decorate('config', config)

  // Make database data accessable as fastify.db
  fastify.decorate('db', new DataStore())

  // Make storage accessable as fastify.storage
  fastify.decorate('storage', new FileStore())

  // Fastify Plugins
  fastify.register(cookie)
  fastify.register(session, {
    store: new SqliteStore(sessions),
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
  fastify.register(websocket)
  fastify.register(totp)
  fastify.register(disableCache)
  fastify.register(errorPage)

  // Hooks
  fastify.register(await fastifyLoadHooks)

  // Register routes
  fastify.register(await loadRoutes)

  // Setup Temp file removing and session clean up tasks
  fastify.register(temporaryUploadsGC)

  await fastify.db.connect()
  await fastify.listen({
    port: config.fastify.port,
    host: config.fastify.bind
  })

} catch (err) {
  error(err.stack)
  process.exit(1)
}
