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
    process.on('exit', () => {
      this.#database.close()
    })
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
   * @param {string} data.password The hashed account password,
   * @param {boolean|0|1} [data.isAdmin=false] if the account is an admin
   * @returns {{
   *  succeeded: boolean,
   *  code: 'OK'|number
   * }}
   */
  async createAccount (data) {
    const { id, username, email, password, isAdmin = false } = data

    this.#database
      .prepare(`
        INSERT INTO "accounts" (
          "id", "username", "email", "password", "isAdmin"
        ) VALUES (
          :id, :username, :email, :password, :isAdmin
        )
      `)
      .run({
        id: id,
        username: username,
        email: email,
        password: password,
        isAdmin: Number(isAdmin)
      })

    return { succeeded: true, code: 'OK' }
  }

  /**
   * Get an account by username
   * @param {string} username The username of the account
   * @returns {{
   *  id: string,
   *  password: string,
   *  secret: string,
   *  isAdmin: boolean
   * }}
   */
  async getAccount (username) {
    const { id: accountID, password: passwordHash, secret, isAdmin } = this.#database
      .prepare('SELECT "id", "password", "secret", "isAdmin" FROM "accounts" WHERE "username" = :username')
      .get({ username: username }) ?? {}

    return {
      id: accountID,
      password: passwordHash,
      secret: secret,
      isAdmin: Boolean(isAdmin)
    }
  }

  /**
   * Enable 2FA for an account by username
   * @param {string} username The username of the account
   * @param {string} secret The 2fa secret
   * @returns {boolean}
   */
  async enable2FA (username, secret) {
    const { changes } = this.#database
      .prepare('UPDATE "accounts" SET "secret" = :secret WHERE "username" = :username AND "secret" IS NULL')
      .run({
        username: username,
        secret: secret
      })

    return changes > 0
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
   * @param {string} data.uploadedAt The upload date & time of the file
   * @param {number|null} data.uploadedUntil The date a file is uploaded until or null for infinity
   * @param {string} [data.album] The optional id of an album to add the file to
   * @param {boolean} [data.isPrivate] If the file is hidden from the user page for others
   * @returns {{
   *  succeeded: boolean,
   *  code: 'OK'|number
   * }}
   */
  async addFile (data) {
    if (data.album) return this.#addNewFileToAlbum(data)

    return this.#addNewFile(data)
  }

  /**
   * Get a file
   * @param {string} id The file id
   * @returns {{
   *  succeeded: boolean,
   *  code: 'OK'|number,
   *  data?: {
   *    file: string,
   *    type: string,
   *    uploadedBy: string,
   *    size: number
   *  }
   * }}
   */
  async getFile (id) {
    const { file, type, uploadedBy, size } = this.#database
      .prepare('SELECT "file", "type", "uploadedBy", "size" FROM "files" WHERE "id" = :fileID')
      .get({ fileID: id }) ?? {}

    if (uploadedBy === undefined) return { succeeded: false, code: 404 } // File doesnt exist

    return {
      succeeded: true,
      code: 'OK',
      data: {
        file: file,
        type: type,
        uploadedBy: uploadedBy,
        size: size
      }
    }
  }

  /**
   * delete a file from the DB
   * @param {string} id The file ID
   * @param {string} username the username trying to delete the file
   * @returns {{
   *  succeeded: boolean,
   *  code: 'OK'|number,
   *  data?: {
   *    file: string
   *  }
   * }}
   */
  async deleteFile (id, username) {
    const { file, uploadedBy } = this.#database
      .prepare('SELECT "file", "uploadedBy" FROM "files" WHERE "id" = :fileID')
      .get({ fileID: id }) ?? {}

    if (file === undefined) return { succeeded: false, code: 404 } // File doesnt exist
    if (username !== uploadedBy) return { succeeded: false, code: 403 } // File is owned by another user

    const { changes } = this.#database
      .prepare('DELETE FROM "files" WHERE "id" = :fileID')
      .run({ fileID: id }) ?? {}

    if (changes === 0) return { succeeded: false, code: 500 } // Unable to remove file from DB

    debug('Removed file from DB', id)

    return {
      succeeded: true,
      code: 'OK',
      data: {
        file: file
      }
    }
  }

  /**
   * Create album and add files to it
   * @param {object} data
   * @param {string} data.id The album id
   * @param {string} data.name The name of the uploaded file
   * @param {string} data.uploadedBy The username of the uploader
   * @param {number|null} data.uploadedAt The upload date & time an ablum was uploaded
   * @param {number|null} data.uploadedUntil The date an ablum is uploaded until or null for infinity
   * @param {boolean} data.isPrivate If the file is hidden from the user page for others
   * @returns {{
   *  succeeded: boolean,
   *  code: 'OK'|number
   * }}
   */
  async createAlbum (data) {
    const { id: albumID, files, uploadedBy, uploadedAt, uploadedUntil, isPrivate } = data

    debug('Album ID', albumID)

    this.#database
      .prepare(`
        INSERT INTO "albums" (
          "id", "title", "uploadedBy", "uploadedAt", "uploadedUntil", "isPrivate"
        ) VALUES (
          :id, :title, :uploadedBy, :uploadedAt, :uploadedUntil, :isPrivate
        )
      `)
      .run({
        id: albumID,
        title: 'Untitled Album',
        uploadedBy: uploadedBy,
        uploadedAt: uploadedAt,
        uploadedUntil: uploadedUntil,
        isPrivate: isPrivate
      })

    const statement = this.#database.prepare('UPDATE "files" SET "inAlbum" = :albumID, "albumOrder" = :albumOrder WHERE "id" = :fileID')
    const transaction = this.#database.transaction((fIDs, aID) => fIDs.map((fID, index) => statement.run({
      albumID: aID,
      albumOrder: index,
      fileID: fID
    })))
    const updated = transaction(files, albumID)
      .reduce((accumulator, currentValue) => (accumulator += currentValue.changes), 0)

    debug('Added', updated, 'files to album')

    return { succeeded: true, code: 'OK' }
  }

  /**
   * Get an album and its files
   * @param {string} id The album id
   * @returns {{
   *  succeeded: boolean,
   *  code: number|'OK',
   *  data?: {
   *    title: string,
   *    uploadedBy: string,
   *    files: [{
   *      id: string,
   *      file: string,
   *      type: string,
   *      order: number
   *    }]
   *  }
   * }}
   */
  async getAlbum (id) {
    const { title, uploadedBy } = this.#database
      .prepare('SELECT "title", "uploadedBy" FROM "albums" WHERE "id" = :fileID')
      .get({ fileID: id }) ?? {}

    if (uploadedBy === undefined) return { succeeded: false, code: 404 } // Album doesnt exist

    const albumFiles = this.#database
      .prepare('SELECT "id", "file", "type", "order" FROM "albumFiles" WHERE "album" = :albumID')
      .all({ albumID: id }) ?? []

    return {
      succeeded: true,
      code: 'OK',
      data: {
        title: title,
        uploadedBy: uploadedBy,
        files: albumFiles
      }
    }
  }

  /**
   * delete an album from the DB
   * @param {string} id The album ID
   * @param {string} username the username trying to delete the album
   * @returns {{
   *  succeeded: boolean,
   *  code: number|'OK',
   *  data?: {
   *    files: [
   *      string
   *    ]
   *  }
   * }}
   */
  async deleteAlbum (id, username) {
    const { uploadedBy, files, entries } = this.#database
      .prepare('SELECT "uploadedBy", "files", "entries" FROM "album" WHERE "id" = :albumID')
      .get({ albumID: id }) ?? {}

    if (uploadedBy === undefined) return { succeeded: false, code: 404 } // Album doesnt exist
    if (username !== uploadedBy) return { succeeded: false, code: 403 } // Album is owned by another user

    const { changes } = this.#database
      .prepare('DELETE FROM "albums" WHERE "id" = :albumID')
      .run({ albumID: id }) ?? {}

    if (changes === 0) return { succeeded: false, code: 500 }

    debug('Removed album', id, 'with', entries, 'files')

    return {
      succeeded: true,
      code: 'OK',
      data: {
        files: files.split(',')
      }
    }
  }

  /**
   * update an albums title or file order
   * @param {string} id The id of the album
   * @param {string} username The user trying to edit the album
   * @param {object} payload
   * @param {string} [payload.title] The new title to set for the album
   * @param {object} [payload.order] and object of `fileID: albumOrders` for the album
   * @returns {{
   *  succeeded: boolean,
   *  code: 'OK'|number
   * }}
   */
  async editAlbum (id, username, payload) {
    const { uploadedBy } = this.#database
      .prepare('SELECT "uploadedBy" FROM "albums" WHERE "id" = :albumID')
      .get({ albumID: id }) ?? {}

    if (uploadedBy === undefined) return { succeeded: false, code: 404 } // Album doesnt exist
    if (username !== uploadedBy) return { succeeded: false, code: 403 } // Album is owned by another user

    const { title, order } = payload

    if (title) await this.#editAlbumTitle(id, title)
    if (order) await this.#editAlbumOrder(id, JSON.parse(order))

    return { succeeded: true, code: 'OK' }
  }

  /**
   * Get a file or albums thumbnail
   * @param {string} id The file/album id
   * @returns {{
   *  succeeded: boolean,
   *  code: number|'OK',
   *  data?: {
   *    uploadedBy: string,
   *    thumbnail: string
   *  }
   * }}
   */
  async getThumbnail (id) {
    const { thumbnail, uploadedBy } = this.#database
      .prepare(`
        SELECT
          "thumbnail",
          "uploadedBy"
        FROM
          (SELECT
            "id",
            "thumbnail",
            "uploadedBy"
          FROM
            "file"
          UNION SELECT
            "id",
            "thumbnail",
            "uploadedBy"
          FROM
            "album"
        ) WHERE "id" = :id
      `)
      .get({ id: id }) ?? {}

    if (uploadedBy === undefined) return { succeeded: false, code: 404 } // File/Album doesnt exist

    return {
      succeeded: true,
      code: 'OK',
      data: {
        uploadedBy: uploadedBy,
        thumbnail: thumbnail
      }
    }
  }

  /**
   * Get user files
   * @param {string} username The username to get the files for
   * @param {object} options
   * @param {number} options.offset the offset for pagination
   * @param {number} options.limit the max amount of items to return
   * @param {'ASC'|'DESC'} options.order the order of the items
   * @param {string} options.filter the filetype filter
   * @param {boolean} options.includePrivate if we should return private files
   * @returns {{
   *  succeeded: boolean,
   *  code: number|'OK',
   *  data?: {
   *    email: string,
   *    files: [{
   *      id: string,
   *      type: string,
   *      isPrivate: number|boolean
   *    }],
   *    total: number
   *  }
   * }}
   */
  async getUserFiles (username, options) {
    const { includePrivate, offset, limit, order, filter } = options
    const { email } = this.#database
      .prepare('SELECT "email" FROM "accounts" WHERE "username" = :username')
      .get({ username: username }) ?? {}

    if (email === undefined) return { succeeded: false, code: 404 } // User doesnt exist

    const searchFilter = column => {
      if (filter === '') return `"${column}" LIKE '%'`
      if (filter === 'text') return [
        `${column}" LIKE '${filter}%'`,
        `OR "${column}" LIKE '%javascript'`,
        `OR "${column}" LIKE '%json'`
      ].join(' ')

      return `"${column}" LIKE '${filter}%'`
    }
    const getFilesIncludePrivate = this.#database
      .prepare(`
        SELECT
          "id",
          "type",
          "isPrivate",
          "total"
        FROM
          "userFiles"
        WHERE
          "uploadedBy" = :username
        AND
          ${searchFilter('type')}
        ORDER BY
          "uploadedAt" ${order}
        LIMIT :limit
        OFFSET :offset
      `)
    const getFilesExcludePrivate = this.#database
      .prepare(`
        SELECT
          "id",
          "type",
          "isPrivate",
          "total"
        FROM
          "userFiles"
        WHERE
          "uploadedBy" = :username
        AND NOT
          "isPrivate" = TRUE
        AND
          ${searchFilter('type')}
        ORDER BY
          "uploadedAt" ${order}
        LIMIT :limit
        OFFSET :offset
      `)
    const files = (includePrivate ? getFilesIncludePrivate : getFilesExcludePrivate)
      .all({
        username: username,
        limit: limit,
        offset: offset
      }) ?? []
    const { total = 0 } = files[0] ?? {}

    return {
      succeeded: true,
      code: 'OK',
      data: {
        email: email,
        files: files,
        total: total
      }
    }
  }

  /**
   * Get user albums
   * @param {string} username The username to get the albums for
   * @param {object} options
   * @param {number} options.offset the offset for pagination
   * @param {number} options.limit the max amount of items to return
   * @param {'ASC'|'DESC'} options.order the order of the items
   * @param {boolean} options.includePrivate if we should return private albums
   * @returns {{
   *  succeeded: boolean,
   *  code: number|'OK',
   *  data?: {
   *    email: string,
   *    albums: [{
   *      id: string,
   *      title: string,
   *      isPrivate: number|boolean,
   *      entries: number
   *    }],
   *    total: number
   *  }
   * }}
   */
  async getUserAlbums (username, options) {
    const { includePrivate, offset, limit, order } = options
    const { email } = this.#database
      .prepare('SELECT "email" FROM "accounts" WHERE "username" = :username')
      .get({ username: username }) ?? {}

    if (email === undefined) return { succeeded: false, code: 404 } // User doesnt exist

    const getAlbumsIncludePrivate = this.#database
      .prepare(`
        SELECT
          "id",
          "title",
          "isPrivate",
          "entries",
          "total"
        FROM
          "userAlbums"
        WHERE
          "uploadedBy" = :username
        ORDER BY
          "uploadedAt" ${order}
        LIMIT :limit
        OFFSET :offset
      `)
    const getAlbumsExcludePrivate = this.#database
      .prepare(`
        SELECT
          "id",
          "title",
          "isPrivate",
          "entries",
          "total"
        FROM
          "userAlbums"
        WHERE
          "uploadedBy" = :username
        AND NOT
          "isPrivate" = TRUE
        ORDER BY
          "uploadedAt" ${order}
        LIMIT :limit
        OFFSET :offset
      `)
    const albums = (includePrivate ? getAlbumsIncludePrivate : getAlbumsExcludePrivate)
      .all({
        username: username,
        limit: limit,
        offset: offset
      }) ?? []
    const { total = 0 } = albums[0] ?? {}

    return {
      succeeded: true,
      code: 'OK',
      data: {
        email: email,
        albums: albums,
        total: total
      }
    }
  }

  /**
   * Get user info
   * @param {string} username The username to get the info for
   * @returns {{
   *  succeeded: boolean,
   *  code: number|'OK',
   *  data?: {
   *    totalSize: number,
   *    totalFiles: number,
   *    totalAlbums: number
   *  }
   * }}
   */
  async getUserInfo (username) {
    const { email } = this.#database
      .prepare('SELECT "email" FROM "accounts" WHERE "username" = :username')
      .get({ username: username }) ?? {}

    if (email === undefined) return { succeeded: false, code: 404 } // User doesnt exist

    const userInfo = this.#database
      .prepare(`
        SELECT
          "totalAlbums",
          "totalFiles",
          "totalSize"
        FROM
          "userInfo"
        WHERE
          "username" = :username
      `)
      .get({
        username: username
      }) ?? {}

    const { totalAlbums, totalFiles, totalSize } = userInfo

    return {
      succeeded: true,
      code: 'OK',
      data: {
        totalAlbums: totalAlbums ?? 0,
        totalFiles: totalFiles ?? 0,
        totalSize: totalSize ?? 0
      }
    }
  }

  /**
   * Remove uploads from the DB where the uploadedUntil has expired
   * @returns {{
   *  succeeded: boolean,
   *  code: number|'OK',
   *  data?: {
   *    expired: [{
   *      file: string,
   *      uploadedBy: string
   *    }]
   *  }
   * }}
   */
  async cleanExpired () {
    const expired = this.#database
      .prepare('DELETE FROM "files" WHERE "uploadedUntil" <= strftime(\'%Y-%m-%dT%H:%M:%fZ\', \'now\') RETURNING "file", "uploadedBy"')
      .all() ?? []

    if (expired.length > 0) debug('Removed', expired.length, 'temporary uploads')

    return {
      succeeded: true,
      code: 'OK',
      data: {
        expired: expired
      }
    }
  }

  /**
   * Update an albums title
   * @param {string} id The album id
   * @param {string} title The new album title
   * @returns {void}
   */
  async #editAlbumTitle (id, title) {
    const newTitle = title !== null && title.trim() === '' ? 'Untitled Album' : title.trim()
    const { changes } = this.#database
      .prepare('UPDATE "albums" SET "title" = :title WHERE "id" = :albumID AND "title" <> :title')
      .run({
        title: newTitle,
        albumID: id
      })

    if (changes > 0) debug('Updated title of album', id)
  }

  /**
   * Update an albums file orders
   * @param {string} id The album id
   * @param {object} order An object of fileID: FileOrder to set the file order in the album
   * @returns {void}
   */
  async #editAlbumOrder (id, order) {
    const files = []

    for (const [ fileID, fileOrder ] of Object.entries(order)) files.push({
      fileID: fileID,
      fileOrder: fileOrder,
      albumID: id
    })

    const statement = this.#database
      .prepare('UPDATE "files" SET "albumOrder" = :fileOrder WHERE "id" = :fileID AND "inAlbum" = :albumID AND "albumOrder" <> :fileOrder')
    const transaction = this.#database
      .transaction(albumFiles => albumFiles.map(({ fileID, fileOrder, albumID }) => statement.run({
        fileOrder,
        fileID,
        albumID
      })))
    const updated = transaction(files)
      .reduce((accumulator, currentValue) => (accumulator += currentValue.changes), 0)

    if (updated > 0) debug('Updated order of', updated, 'files in album', id)
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
   * @param {string} data.uploadedAt The upload date & time the file was uploaded
   * @param {number|null} data.uploadedUntil The date a file is uploaded until or null for infinity
   * @param {string} data.album The id of an album to add the file to
   * @returns {{
   *  succeeded: boolean,
   *  code: 'OK'|number
   * }}
   */
  async #addNewFile (data) {
    const { id, name, file, size, type, uploadedBy, uploadedAt, uploadedUntil, isPrivate } = data

    this.#database
      .prepare(`
        INSERT INTO "files" (
          "id", "name", "file", "size", "type", "uploadedBy", "uploadedAt", "uploadedUntil", "isPrivate"
        ) VALUES (
          :id, :name, :file, :size, :type, :uploadedBy, :uploadedAt, :uploadedUntil, :isPrivate
        )
      `)
      .run({
        id: id,
        name: name,
        file: file,
        size: size,
        type: type,
        uploadedBy: uploadedBy,
        uploadedAt: uploadedAt,
        uploadedUntil: uploadedUntil,
        isPrivate: isPrivate
      })

    return { succeeded: true, code: 'OK' }
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
   * @param {boolean} data.isPrivate If the file is hidden from the user page for others
   * @returns {{
   *  succeeded: boolean,
   *  code: 'OK'|number
   * }}
   */
  async #addNewFileToAlbum (data) {
    const { album: albumID, id, name, file, size, type, uploadedBy } = data

    const { uploadedAt: albumUploadedAt, uploadedBy: albumUploadedBy, isPrivate: albumIsPrivate, uploadedUntil: albumUploadedUntil, entries: albumEntries } = this.#database
      .prepare(`
        SELECT
          "uploadedAt",
          "uploadedBy",
          "isPrivate",
          (SELECT
            "entries"
          FROM
            "album"
          WHERE
            "id" = "albums"."id"
          ) AS "entries",
          "uploadedUntil"
        FROM
          "albums"
        WHERE "id" = :albumID
      `)
      .get({ albumID: albumID }) ?? {}

    if (albumUploadedBy === undefined) return { succeeded: false, code: 404 } // Album does not exist
    if (albumUploadedBy !== uploadedBy) return { succeeded: false, code: 403 } // Album is owned by another user

    this.#database
      .prepare(`
        INSERT INTO "files" (
          "id", "name", "file", "size", "type", "uploadedBy", "uploadedAt", "uploadedUntil", "isPrivate", "inAlbum", "albumOrder"
        ) VALUES (
          :id, :name, :file, :size, :type, :uploadedBy, :uploadedAt, :uploadedUntil, :isPrivate, :inAlbum, :albumOrder
        )
      `)
      .run({
        id: id,
        name: name,
        file: file,
        size: size,
        type: type,
        uploadedBy: uploadedBy,
        uploadedAt: albumUploadedAt,
        uploadedUntil: albumUploadedUntil,
        isPrivate: albumIsPrivate,
        inAlbum: albumID,
        albumOrder: albumEntries
      })

    return { succeeded: true, code: 'OK' }
  }

}
