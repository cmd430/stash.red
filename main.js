import Database from 'better-sqlite3'
import Fastify from 'fastify'
import multipart from '@fastify/multipart'
import betterSqlite3 from '@punkish/fastify-better-sqlite3'
/*
 * import { createWriteStream } from 'node:fs'
 * import { pipeline } from 'node:stream/promises'
 */

try {

  const app = Fastify({
    logger: true,
    trustProxy: true
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
      "fileName" TEXT NOT NULL,
      "file" BLOB NOT NULL,
      PRIMARY KEY("id" AUTOINCREMENT)
    )`)

    return db
  }()))

  app.get('/', async (req, reply) => {
    const { dt } = app.betterSqlite3
    .prepare('SELECT Strftime(\'%d/%m/%Y %H:%M:%S\') AS dt')
    .get()
    const { version } = app.betterSqlite3
    .prepare('SELECT sqlite_version() AS version')
    .get()

    return {
      currentDate: dt,
      sqliteVersion: version
    }
  })

  app.put('/upload', async req => {
    for await (const filePart of req.files()) {

      console.debug({
        type: filePart.type,
        filename: filePart.filename,
        mimetype: filePart.mimetype,
        file: filePart.file
      })

      // Store as blob
      app.betterSqlite3
      .prepare('INSERT INTO test (fileName, file) VALUES (?, ?)')
      .run(filePart.filename, await filePart.toBuffer())

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
