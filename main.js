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
import { hash, compare } from 'bcrypt'
import { config } from './utils/config.js'
import { createAzureContainer, createAzureBlob, setAzureBlob, getAzureBlobBuffer, deleteAzureBlob, deriveThumbnailBlob } from './utils/azureBlob.js'
import temporaryUploadsGC from './utils/temporaryUploadsGC.js'
import generateThumbnail from './utils/generateThumbnail.js'
import mimetypeFilter from './utils/mimetypeFilter.js'
import databaseConnection from './utils/databaseConnection.js'
import fastifyLogger from './utils/fastifyLogger.js'

// eslint-disable-next-line no-unused-vars
const { log, debug, info, warn, error } = new Log('Main')
const nanoid = customAlphabet('123456789ABCDEFGHJKLMNPQRSTUVWXYZ_abcdefghijkmnpqrstuvwxyz-', 9)

try {
  const fastify = Fastify({
    logger: fastifyLogger,
    trustProxy: true,
    genReqId: () => nanoid(5)
  })

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
    propertyName: 'render', // The template can now be rendered via `reply.render()` and `fastify.render()`
    defaultContext: {
      dev: process.env.NODE_ENV === 'development'
    },
    partials: {},
    options: {
      useDataVariables: true
    }
  })

  // Home page
  fastify.get('/', async (req, reply) => {
    return reply.render('index')
  })

  // Get uploaded file by ID
  fastify.get('/f/:id', async (req, reply) => {
    const { id } = req.params

    const { file, type, uploaded_by } = fastify.betterSqlite3
      .prepare('SELECT file, type, uploaded_by FROM files WHERE id = ?')
      .get(id)

    reply.type(mimetypeFilter(type))
    reply.send(await getAzureBlobBuffer(uploaded_by, file))
  })

  // Get uploaded file thumbnail
  fastify.get('/f/:id/thumbnail', async (req, reply) => {
    const { id } = req.params
    const { file, uploaded_by } = fastify.betterSqlite3
      .prepare('SELECT file, uploaded_by FROM files WHERE id = ?')
      .get(id)

    reply.type('image/webp')
    reply.send(await getAzureBlobBuffer(uploaded_by, deriveThumbnailBlob(file)))
  })

  // Get info for uploaded file
  fastify.get('/f/:id/info', async (req, reply) => {
    const { id } = req.params

    return fastify.betterSqlite3
      .prepare('SELECT * FROM files WHERE id = ?')
      .get(id)
  })

  // TEMP: test file delete
  fastify.get('/f/:id/delete', async (req, reply) => {
    const { id } = req.params

    const { file, uploaded_by } = fastify.betterSqlite3
      .prepare('SELECT file, uploaded_by FROM files WHERE id = ?')
      .get(id)

    await deleteAzureBlob(uploaded_by, file)

    return {
      message: 'blob deleted'
    }
  })


  // Signup
  fastify.post('/signup', async req => {
    // TODO: make safe and not shit
    const { username, email, password, confirm } = req.body
    const userameValid = Boolean((/^[a-zA-Z0-9]{3,63}$/).test(username))

    debug({ username, email, password, confirm, userameValid })

    if (password !== confirm || !username || !email || !userameValid) return new Error('Oh no you fucked up!')

    try {
      fastify.betterSqlite3
        .prepare('INSERT INTO users (username, email, password) VALUES (?, ?, ?)')
        .run(username, email, await hash(password, config.bcrypt.rounds))

      await createAzureContainer(username)

      return {
        message: 'Account created successfully'
      }
    } catch (err) {
      error(err)
    }

  })

  // Upload a file
  fastify.post('/upload', async req => {
    const files = req.files()
    const uploadIDs = []

    for await (const file of files) {

      // TODO: get username from session
      const { fileBlobName, azureBlobClients } = createAzureBlob('testAccount', file.filename)

      const uploadID = nanoid(8)
      const fileBuffer = await file.toBuffer()
      const thumbnailBuffer = await generateThumbnail(file.mimetype, fileBuffer)
      const ttl = parseInt(file.fields?.ttl?.value ?? 0) > 0 ? parseInt(file.fields.ttl.value) : null
      // TODO: get username from session
      const username = 'testAccount'

      fastify.betterSqlite3
        .prepare('INSERT INTO files (id, name, file, type, uploaded_at, uploaded_by, ttl) VALUES (?, ?, ?, ?, strftime(\'%Y-%m-%dT%H:%M:%fZ\'), ?, ?)')
        .run(uploadID, file.filename, fileBlobName, file.mimetype, username, ttl)

      await setAzureBlob(fileBuffer, thumbnailBuffer, azureBlobClients)

      // Make sure we can access the file ids after the upload
      uploadIDs.push(uploadID)
    }

    return {
      message : `${uploadIDs.length} file(s) uploaded`,
      ids: uploadIDs
    }
  })

  // Temp Upload cleanup
  temporaryUploadsGC(databaseConnection)

  await fastify.listen({
    port: 8080,
    host: '::'
  })

} catch (err) {

  error(err)
  process.exit(1)

}
