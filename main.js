import { resolve } from 'node:path'
import Database from 'better-sqlite3'
import Fastify from 'fastify'
import serveStatic from '@fastify/static'
import multipart from '@fastify/multipart'
import betterSqlite3 from '@punkish/fastify-better-sqlite3'
import generateThumbnail from './utils/generateThumbnail.js'
import mimetypeFilter from './utils/mimetypeFilter.js'

/*
 * import { createWriteStream } from 'node:fs'
 * import { pipeline } from 'node:stream/promises'
 */

try {

  const app = Fastify({
    logger: true,
    trustProxy: true
  })

  app.register(serveStatic, {
    root: resolve('./public')
  })
  app.register(multipart, {
    limits: {
      fileSize: 499 * 1000 * 1000,  // Max file size in bytes
      files: 100                    // Max number of file fields
    }
  })
  app.register(betterSqlite3, (function () {
    const db = new Database('./database/stash.db', {
      readonly: false,
      fileMustExist: false,
      timeout: 5000,
      verbose: null
    })

    db.pragma('journal_mode = WAL')

    // TODO: Code to setup DB if not already setup from SQL file
    db.exec(`CREATE TABLE IF NOT EXISTS "test" (
      "id" INTEGER NOT NULL UNIQUE,
      "name" TEXT NOT NULL,
      "file" BLOB NOT NULL,
      "type" TEXT NOT NULL,
      "thumbnail" BLOB,
      "uploaded_at" TEXT NOT NULL,
      "uploaded_by" TEXT NOT NULL DEFAULT "SYSTEM",
      PRIMARY KEY("id" AUTOINCREMENT)
    );`)

    return db
  }()))


  app.get('/', async (req, reply) => {
    return reply.sendFile('index.html')
  })

  app.get('/:id', (req, reply) => {
    const { id } = req.params

    const { file, type } = app.betterSqlite3
    .prepare('SELECT file, type FROM test WHERE id = ?')
    .get(id)

    reply.type(type)
    reply.send(file)
  })

  app.get('/:id/thumbnail', (req, reply) => {
    const { id } = req.params

    const { thumbnail } = app.betterSqlite3
    .prepare('SELECT thumbnail FROM test WHERE id = ?')
    .get(id)

    reply.type('image/webp')
    reply.send(thumbnail)
  })

  app.get('/:id/info', async (req, reply) => {
    const { id } = req.params

    const { name, type, uploaded_at, uploaded_by } = app.betterSqlite3
    .prepare('SELECT name, type, uploaded_at, uploaded_by FROM test WHERE id = ?')
    .get(id)

    return {
      name,
      type,
      uploaded_at,
      uploaded_by
    }
  })

  app.post('/upload', async req => {
    for await (const filePart of req.files()) {

      console.debug({
        type: filePart.type,
        filename: filePart.filename,
        mimetype: filePart.mimetype
      })

      filePart.mimetype = mimetypeFilter(filePart.mimetype)

      const fileBlob = await filePart.toBuffer()
      const thumbnailBlob = filePart.mimetype.includes('image') ? await generateThumbnail(fileBlob) : null // <- TODO: Video Thumbnail Generation

      // Store blob in DB
      app.betterSqlite3
      .prepare('INSERT INTO test (name, file, type, thumbnail, uploaded_at) VALUES (?, ?, ?, ?, strftime(\'%Y-%m-%dT%H:%M:%fZ\'))')
      .run(filePart.filename, fileBlob, filePart.mimetype, thumbnailBlob)

      // Store as File: await pipeline(filePart.file, createWriteStream(`./uploads/${filePart.filename}`))
    }

    return {
      message : 'files uploaded'
    }
  })

  await app.listen({
    port: 8080,
    host: '::'
  })

} catch (err) {

  console.error(err)
  process.exit(1)

}
