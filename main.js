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
import createError from 'http-errors'
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
    partials: {},
    options: {
      useDataVariables: true
    }
  })

  // Home page
  fastify.get('/', async (req, reply) => {
    return reply.view('index')
  })
  fastify.get('/login', async (req, reply) => {
    return reply.view('login')
  })


  // TODO: add error handling (404 etc)


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
  fastify.post('/signup', async (req, reply) => {
    // TODO: make safe and not shit
    const { username, email, password, confirm } = req.body
    const userameValid = Boolean((/^[a-zA-Z0-9]{3,63}$/).test(username))

    if (password !== confirm || !username || !email || !userameValid) {
      reply.code(400)
      return createError(400, password !== confirm ? 'Passwords do not match' : 'All Fields Required')
    }

    try {
      const { _id } = fastify.betterSqlite3
        .prepare('INSERT INTO accounts (username, email, password) VALUES (?, ?, ?)')
        .run(username, email, await hash(password, config.bcrypt.rounds))

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
    // TODO: make safe and not shit
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

  // Logout
  fastify.get('/logout', (req, reply) => {
    if (req.session.authenticated) {
      req.session.destroy(err => {
        if (err) {
          reply.code(500)
          return createError(500, 'Internal Server Error')
        } else {
          reply.redirect('/')
        }
      })
    } else {
      reply.redirect('/')
    }
  })


  // Upload a file
  fastify.post('/upload', async (req, reply) => {
    const files = req.files()
    const uploadIDs = []
    const albumID = files.length > 1 ? nanoid(8) : null

    // TODO albumID bound to uploads

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

    if (uploadIDs.length === 1) return reply.redirect(201, `/f/${uploadIDs[0]}`)

    reply.redirect(201, `/a/${albumID}`)
  })

  fastify.setErrorHandler((err, req, reply) => {
    if (!err.status) return reply.send(err)

    // TODO: remove stack trace if prod mode
    err.code = err.status
    reply.view('error', err)
  })

  // Temporary upload cleanup
  temporaryUploadsGC(databaseConnection)

  await fastify.listen({
    port: 8080,
    host: '::'
  })

} catch (err) {

  error(err)
  process.exit(1)

}
