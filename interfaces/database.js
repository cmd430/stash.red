import { Log } from 'cmd430-utils'

// eslint-disable-next-line no-unused-vars
const { log, debug, info, warn, error } = new Log('Database')

/**
 * Base class for DatabaseInterface
 * @interface
 */
export class DatabaseInterfaceBase {
  /**
   * Connect to the database
   * @public
   * @async
   * @method
   * @name connect
   */

  /**
   * add a new account to the db
   * @public
   * @async
   * @method
   * @name createAccount
   * @param {object} data
   * @param {string} data.id The account ID
   * @param {string} data.username The account username
   * @param {string} data.email The account email
   * @param {string} data.password The hashed account password
   * @returns {{
   *  succeeded: boolean,
   *  code: 'OK'|number
   * }}
   */

  /**
   * Get an account by username
   * @public
   * @async
   * @method
   * @name getAccount
   * @param {string} username The username of the account
   * @returns {{
   *  id: string,
   *  password: string,
   *  isAdmin: boolean
   * }}
   */

  /**
   * Add a file
   * @public
   * @async
   * @method
   * @name addFile
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
   * @returns {{
   *  succeeded: boolean,
   *  code: 'OK'|number
   * }}
   */

  /**
   * Get a file
   * @public
   * @async
   * @method
   * @name getFile
   * @param {string} id The file id
   * @returns {{
   *  succeeded: boolean,
   *  code: 'OK'|number,
   *  data?: {
   *    file: string,
   *    type: string
   *    uploadedBy: string
   *    size: number
   *  }
   * }}
   */

  /**
   * delete a file from the DB
   * @public
   * @async
   * @method
   * @name deleteFile
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

  /**
   * Create album and add files to it
   * @public
   * @async
   * @method
   * @name createAlbum
   * @param {object} data
   * @param {string} data.id The album id
   * @param {string} data.name The name of the uploaded file
   * @param {string} data.uploadedBy The username of the uploader
   * @param {number|null} data.ttl The time to live in milliseconds or null for infinity
   * @param {boolean} data.isPrivate If the file is hidden from the user page for others
   * @returns {{
   *  succeeded: boolean,
   *  code: 'OK'|number
   * }}
   */

  /**
   * Get an album and its files
   * @public
   * @async
   * @method
   * @name getAlbum
   * @param {string} id The album id
   * @returns {{
   *  succeeded: boolean,
   *  code: number|'OK',
   *  data?: {
   *    title: string,
   *    uploadedBy: string,
   *    files: array<{
   *      id: string,
   *      file: string,
   *      type: string,
   *      order: number
   *    }>
   *  }
   * }}
   */

  /**
   * delete an album from the DB
   * @public
   * @async
   * @method
   * @name deleteAlbum
   * @param {string} id The album ID
   * @param {string} username the username trying to delete the album
   * @returns {{
   *  succeeded: boolean,
   *  code: number|'OK',
   *  data?: {
   *    files: array<string>
   *  }
   * }}
   */

  /**
   * update an albums title or file order
   * @public
   * @async
   * @method
   * @name editAlbum
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

  /**
   * Get a file or albums thumbnail
   * @public
   * @async
   * @method
   * @name getThumbnail
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

  /**
   * Get user files
   * @public
   * @async
   * @method
   * @name getUserFiles
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
   *    files: array<{
   *      id: string,
   *      type: string,
   *      isPrivate: number|boolean
   *    }>,
   *    total: number
   *  }
   * }}
   */

  /**
   * Get user albums
   * @public
   * @async
   * @method
   * @name getUserAlbums
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
   *    albums: array<{
   *      id: string,
   *      title: string,
   *      isPrivate: number|boolean,
   *      entries: number
   *    }>,
   *    total: number
   *  }
   * }}
   */

  /**
   * Remove uploads from the DB where the ttl has expired
   * @public
   * @async
   * @method
   * @name cleanExpired
   * @returns {{
   *  succeeded: boolean,
   *  code: number|'OK',
   *  data?: {
   *    expired: array<{
   *      file: string,
   *      uploadedBy: string
   *    }>
   *  }
   * }}
   */
}

/**
 * @typedef { "sqlite" } interfaceTypes
 */

/**
 * @param {interfaceTypes} interfaceType
 * @returns {DatabaseInterface}
 */
export async function getDatabaseInterface (interfaceType) {
  const { default: databaseInterface } = await import(`./database/${interfaceType}Database.js`)

  return databaseInterface
}
