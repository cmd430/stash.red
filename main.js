import { resolve, extname } from 'node:path'
import { randomUUID } from 'node:crypto'
import { Log } from 'cmd430-utils'
import { customAlphabet } from 'nanoid'
import Fastify from 'fastify'
import serveStatic from '@fastify/static'
import multipart from '@fastify/multipart'
import formbody from '@fastify/formbody'
import view from '@fastify/view'
import betterSqlite3 from '@punkish/fastify-better-sqlite3'
import handlebars from 'handlebars'
import { hash, compare } from 'bcrypt'
import { config } from './utils/config.js'
import { blobServiceClient } from './utils/azureBlob.js'
import generateThumbnail from './utils/generateThumbnail.js'
import mimetypeFilter from './utils/mimetypeFilter.js'
import databaseConnection from './utils/databaseConnection.js'
import fastifyLogger from './utils/fastifyLogger.js'

// eslint-disable-next-line no-unused-vars
const { log, debug, info, warn, error } = new Log('Main')
const nanoid = customAlphabet('123456789ABCDEFGHJKLMNPQRSTUVWXYZ_abcdefghijkmnpqrstuvwxyz-', 9)

try {
  const app = Fastify({
    logger: fastifyLogger,
    trustProxy: true,
    genReqId: () => nanoid(5)
  })

  app.register(serveStatic, {
    root: resolve('./public')
  })
  app.register(multipart, {
    limits: {
      fileSize: 499 * 1000 * 1000,  // Max file size in bytes
      files: 100                    // Max number of file uploads in one go
    }
  })
  app.register(formbody)
  app.register(betterSqlite3, databaseConnection)
  app.register(view, {
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
  app.get('/', async (req, reply) => {
    return reply.render('index')
  })

  // Get uploaded file by ID
  app.get('/f/:id', (req, reply) => {
    const { id } = req.params

    const { file, type } = app.betterSqlite3
      .prepare('SELECT file, type FROM files WHERE id = ?')
      .get(id)

    reply.type(mimetypeFilter(type))
    reply.send(file)
  })

  // Get uploaded file thumbnail
  app.get('/f/:id/thumbnail', (req, reply) => {
    const { id } = req.params

    const { thumbnail } = app.betterSqlite3
      .prepare('SELECT thumbnail FROM files WHERE id = ?')
      .get(id)

    reply.type('image/webp')
    reply.send(thumbnail)
  })

  // Get info for uploaded file
  app.get('/f/:id/info', async (req, reply) => {
    const { id } = req.params

    const { name, type, uploaded_at, uploaded_by, ttl } = app.betterSqlite3
      .prepare('SELECT name, type, uploaded_at, uploaded_by, ttl FROM files WHERE id = ?')
      .get(id)

    return {
      name,
      type,
      uploaded_at,
      uploaded_by,
      ttl
    }
  })

  // Signup
  app.post('/signup', async req => {
    // TODO: make safe and not shit
    const { username, email, password, confirm } = req.body
    const userameValid = Boolean((/^[a-zA-Z0-9]{3,63}$/).test(username))

    debug({ username, email, password, confirm, userameValid })


    if (password !== confirm || !username || !email || !userameValid) return new Error('Oh no you fucked up!')

    try {
      app.betterSqlite3
        .prepare('INSERT INTO users (username, email, password) VALUES (?, ?, ?)')
        .run(username, email, await hash(password, config.bcrypt.rounds))

      const azureContainerClient = blobServiceClient.getContainerClient(username.toLowerCase())
      const azureCreateContainerResponse = await azureContainerClient.create()

      debug(`Container was created successfully.\n\trequestId:${azureCreateContainerResponse.requestId}\n\tURL: ${azureContainerClient.url}`)

      return {
        message: 'Account created successfully'
      }

    } catch (err) {
      error(err)
    }

  })

  // Upload a file
  app.post('/upload', async req => {
    const files = req.files()
    const uploadIDs = []

    for await (const file of files) {

      // TODO: get username from session
      const azureContainerClient = blobServiceClient.getContainerClient('testAccount'.toLowerCase())
      const fileBlobName = `${randomUUID()}${extname(file.filename)}`
      const thumbnailBlobName = `thumbnail/thumbnail_${randomUUID()}${extname(file.filename)}`
      const azureFileBlockBlobClient = azureContainerClient.getBlockBlobClient(fileBlobName)
      const azureThumbnailBlockBlobClient = azureContainerClient.getBlockBlobClient(thumbnailBlobName)

      debug(`\nUploading file to Azure storage as blob\n\tname: ${fileBlobName}:\n\tURL: ${azureContainerClient.url}`)
      debug(`\nUploading thumbnail to Azure storage as blob\n\tname: ${thumbnailBlobName}:\n\tURL: ${azureContainerClient.url}`)

      const uploadID = nanoid(8)
      const fileBlob = await file.toBuffer()
      const thumbnailBlob = await generateThumbnail(file.mimetype, fileBlob)
      const ttl = parseInt(file.fields?.ttl?.value ?? 0) > 0 ? parseInt(file.fields.ttl.value) : null

      // Store blob in DB
      // TODO: Store blob in Azure blob storage?
      app.betterSqlite3
        .prepare('INSERT INTO files (id, name, file, type, thumbnail, uploaded_at, ttl) VALUES (?, ?, ?, ?, ?, strftime(\'%Y-%m-%dT%H:%M:%fZ\'), ?)')
        .run(uploadID, file.filename, fileBlobName, file.mimetype, thumbnailBlobName, ttl)

      const azureFileUploadBlobResponse = await azureFileBlockBlobClient.upload(fileBlob, fileBlob.length)
      const azureThumbnailUploadBlobResponse = await azureThumbnailBlockBlobClient.upload(thumbnailBlob, thumbnailBlob.length)

      debug(`File Blob was uploaded successfully. requestId: ${azureFileUploadBlobResponse.requestId}`)
      debug(`Thumbnail Blob was uploaded successfully. requestId: ${azureThumbnailUploadBlobResponse.requestId}`)

      // Make sure we can access the file ids after the upload
      uploadIDs.push(uploadID)
    }

    return {
      message : `${uploadIDs.length} file(s) uploaded`,
      ids: uploadIDs
    }
  })

  await app.listen({
    port: 8080,
    host: '::'
  })

} catch (err) {

  error(err)
  process.exit(1)

}
