import { readFile, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { Log } from 'cmd430-utils'
import Database from 'better-sqlite3'
import { DatabaseInterfaceBase } from '../database.js'

// eslint-disable-next-line no-unused-vars
const { log, debug, info, warn, error } = new Log('Database (Sqlite3)')

export default class DatabaseInterface extends DatabaseInterfaceBase {

  #database = null

  /**
   * Connect to the database
   */
  async connect () {
    this.#database = new Database('./database/stash.db', {
      readonly: false,
      fileMustExist: false,
      timeout: 5000,
      verbose: null
    })

    this.#database.pragma('journal_mode = WAL')

    for (const table of await readdir(resolve('./database/tables'))) this.#database.exec(await readFile(resolve(`./database/tables/${table}`), {
      encoding: 'utf8'
    }))
    for (const index of await readdir(resolve('./database/indices'))) this.#database.exec(await readFile(resolve(`./database/indices/${index}`), {
      encoding: 'utf8'
    }))
    for (const trigger of await readdir(resolve('./database/triggers'))) this.#database.exec(await readFile(resolve(`./database/triggers/${trigger}`), {
      encoding: 'utf8'
    }))
    for (const view of await readdir(resolve('./database/views'))) this.#database.exec(await readFile(resolve(`./database/views/${view}`), {
      encoding: 'utf8'
    }))

    // Gracefully close the DB on exit
    process.on('exit', () => this.#database.close())
    process.on('SIGHUP', () => process.exit(128 + 1))
    process.on('SIGINT', () => process.exit(128 + 2))
    process.on('SIGTERM', () => process.exit(128 + 15))
  }

  /**
   * add a new account to the db
   * @param {object} data
   * @param {string} data.id The account ID
   * @param {string} data.username The account username
   * @param {string} data.email The account email
   * @param {string} data.password The hashed account password
   * @returns {void|Error}
   */
  async createAccount (data) {
    const { id, username, email, password } = data

    this.#database
      .prepare('INSERT INTO "accounts" ("id", "username", "email", "password") VALUES (?, ?, ?)')
      .run(id, username, email, password)
  }

  /**
   * Get an account by username
   * @param {string} username The username of the account
   * @returns {{id: string, password: string, isAdmin: boolean }}
   */
  async getAccount (username) {
    const { id: accountID, password: passwordHash, isAdmin } = this.#database
      .prepare('SELECT "id", "password", "isAdmin" FROM "accounts" WHERE "username" = ?')
      .get(username)

    return {
      id: accountID,
      password: passwordHash,
      isAdmin: Boolean(isAdmin)
    }
  }

  /**
   * Add a file
   * @param {object} data
   * @param {string} data.id The file id
   * @param {string} data.name The name of the uploaded file
   * @param {string} data.file The name of the file in storage
   * @param {number} data.size The size in bytes of the file
   * @param {string} data.type The mimetype of the file
   * @param {string} data.uploadedBy The username of the uploader
   * @param {string} [data.album] The optional id of an album to add the file to
   * @param {number|null} [data.ttl] The time to live in milliseconds or null for infinity
   * @param {boolean} [data.isPrivate] If the file is hidden from the user page for others
   * @returns {result|Error}
   */
  async addFile (data) {
    if (data.album) return this.#addNewFileToAlbum(data)

    return this.#addNewFile(data)
  }

  /**
   * Create album and add files to it
   * @param {object} data
   * @param {string} data.id The album id
   * @param {string} data.name The name of the uploaded file
   * @param {string} data.uploadedBy The username of the uploader
   * @param {number|null} data.ttl The time to live in milliseconds or null for infinity
   * @param {boolean} data.isPrivate If the file is hidden from the user page for others
   * @returns {void|Error}
   */
  async createAlbum (data) {
    const { id: albumID, files, uploadedBy, ttl, isPrivate } = data

    debug('Album ID', albumID)

    const statement = this.#database.prepare('UPDATE "files" SET "inAlbum" = ?, "albumOrder" = ? WHERE "id" = ?')
    const transaction = this.#database.transaction((fIDs, aID) => fIDs.map((fID, index) => statement.run(aID, index, fID)))
    const updated = transaction(files, albumID)
      .reduce((accumulator, currentValue) => (accumulator += currentValue.changes), 0)

    this.#database
      .prepare('INSERT INTO "albums" ("id", "title", "uploadedBy", "ttl", "isPrivate") VALUES (?, ?, ?, ?, ?)')
      .run(albumID, 'Untitled Album', uploadedBy, ttl, isPrivate)

    debug('Added', updated, 'files to album')
  }

  /**
   * Return succeeded object with result
   * @param {boolean} result
   * @returns {result}
   */
  // eslint-disable-next-line class-methods-use-this
  #result (result) {
    return {
      succeeded: Boolean(result)
    }
  }

  /**
   * Add a file (no album)
   * @param {object} data
   * @param {string} data.id The file id
   * @param {string} data.name The name of the uploaded file
   * @param {string} data.file The name of the file in storage
   * @param {number} data.size The size in bytes of the file
   * @param {string} data.type The mimetype of the file
   * @param {string} data.uploadedBy The username of the uploader
   * @param {string} data.album The id of an album to add the file to
   * @returns {result|Error}
   */
  #addNewFile (data) {
    const { id, name, file, size, type, uploadedBy, ttl, isPrivate } = data

    this.#database
      .prepare('INSERT INTO "files" ("id", "name", "file", "size", "type", "uploadedBy", "ttl", "isPrivate") VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(id, name, file, size, type, uploadedBy, ttl, isPrivate)

    return this.#result(true)
  }

  /**
   * Add a file (to an album)
   * @param {object} data
   * @param {string} data.id The file id
   * @param {string} data.name The name of the uploaded file
   * @param {string} data.file The name of the file in storage
   * @param {number} data.size The size in bytes of the file
   * @param {string} data.type The mimetype of the file
   * @param {string} data.uploadedBy The username of the uploader
   * @param {number|null} data.ttl The time to live in milliseconds or null for infinity
   * @param {boolean} data.isPrivate If the file is hidden from the user page for others
   * @returns {result|Error}
   */
  #addNewFileToAlbum (data) {
    const { album: albumID, id, name, file, size, type, uploadedBy } = data

    const album = this.#database
      .prepare(`SELECT * FROM (SELECT "id", "uploadedAt", "uploadedBy", "isPrivate", "entries", "ttl" FROM "albums" INNER JOIN (
                SELECT "entries" FROM "album"
              ) AS "entries" ON "id" = "id" GROUP BY "id") WHERE "id" = ?`)
      .get(albumID)

    if (!album) return this.#result(false)

    const { uploadedAt: albumUploadedAt, uploadedBy: albumUploadedBy, isPrivate: albumIsPrivate, ttl: albumTimeToLive, entries: albumEntries } = album

    if (albumUploadedBy !== uploadedBy) return this.#result(false)

    this.#database
      .prepare('INSERT INTO "files" ("id", "name", "file", "size", "type", "uploadedAt", "uploadedBy", "ttl", "isPrivate", "inAlbum", "albumOrder") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(id, name, file, size, type, albumUploadedAt, uploadedBy, albumTimeToLive, albumIsPrivate, albumID, albumEntries)

    return this.#result(true)
  }

  /**
   * @typedef {{ succeeded: boolean }} result
   */

}
