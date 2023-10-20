import Database from 'better-sqlite3'
import temporaryUploadsGC from './temporaryUploadsGC.js'

export default function databaseConnection () {

  const db = new Database('./database/stash.db', {
    readonly: false,
    fileMustExist: false,
    timeout: 5000,
    verbose: null
  })

  db.pragma('journal_mode = WAL')

  // TODO: Code to setup DB if not already setup from SQL file
  db.exec(`CREATE TABLE IF NOT EXISTS "test" (
      "_id" INTEGER NOT NULL UNIQUE,
      "id" TEXT NOT NULL UNIQUE,
      "name" TEXT NOT NULL,
      "file" BLOB NOT NULL,
      "type" TEXT NOT NULL,
      "thumbnail" BLOB,
      "uploaded_at" TEXT NOT NULL,
      "uploaded_by" TEXT NOT NULL DEFAULT "SYSTEM",
      "ttl" INTEGER,
      PRIMARY KEY("_id" AUTOINCREMENT)
    );`)


  // TTL cleanup
  temporaryUploadsGC(db)

  return db

}
