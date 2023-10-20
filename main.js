/*
 * import { createWriteStream } from 'node:fs'
 * import { pipeline } from 'node:stream/promises'
 */
import { resolve } from 'node:path'
import { Log } from 'cmd430-utils'
import { nanoid } from 'nanoid'
import Fastify from 'fastify'
import serveStatic from '@fastify/static'
import multipart from '@fastify/multipart'
import view from '@fastify/view'
import betterSqlite3 from '@punkish/fastify-better-sqlite3'
import handlebars from 'handlebars'
import generateThumbnail from './utils/generateThumbnail.js'
import mimetypeFilter from './utils/mimetypeFilter.js'
import databaseConnection from './utils/databaseConnection.js'
import fastifyLogger from './utils/fastifyLogger.js'

// eslint-disable-next-line no-unused-vars
const { log, debug, info, warn, error } = new Log('Main')

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
  app.register(betterSqlite3, databaseConnection())
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
    .prepare('SELECT file, type FROM test WHERE id = ?')
    .get(id)

    reply.type(mimetypeFilter(type))
    reply.send(file)
  })

  // Get uploaded file thumbnail
  app.get('/f/:id/thumbnail', (req, reply) => {
    const { id } = req.params

    const { thumbnail } = app.betterSqlite3
    .prepare('SELECT thumbnail FROM test WHERE id = ?')
    .get(id)

    reply.type('image/webp')
    reply.send(thumbnail)
  })

  // Get info for uploaded file
  app.get('/f/:id/info', async (req, reply) => {
    const { id } = req.params

    const { name, type, uploaded_at, uploaded_by, ttl } = app.betterSqlite3
    .prepare('SELECT name, type, uploaded_at, uploaded_by, ttl FROM test WHERE id = ?')
    .get(id)

    return {
      name,
      type,
      uploaded_at,
      uploaded_by,
      ttl
    }
  })

  // Upload a file
  app.post('/upload', async req => {
    const files = req.files()
    const uploadIDs = []

    for await (const file of files) {
      /*
       *debug({
       *  requestID: req.id,
       *  type: file.type,
       *  filename: file.filename,
       *  mimetype: file.mimetype,
       *  fields: file.fields
       *})
       */
      const uploadID = nanoid(12)
      const fileBlob = await file.toBuffer()
      const thumbnailBlob = await generateThumbnail(file.mimetype, fileBlob)
      const ttl = parseInt(file.fields?.ttl?.value ?? 0) > 0 ? parseInt(file.fields.ttl.value) : null

      // Store blob in DB
      app.betterSqlite3
      .prepare('INSERT INTO test (id, name, file, type, thumbnail, uploaded_at, ttl) VALUES (?, ?, ?, ?, ?, strftime(\'%Y-%m-%dT%H:%M:%fZ\'), ?)')
      .run(uploadID, file.filename, fileBlob, file.mimetype, thumbnailBlob, ttl)

      // Make sure we can access the file ids after the upload
      uploadIDs.push(uploadID)

      // Store as File: await pipeline(file.file, createWriteStream(`./uploads/${file.filename}`))
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
