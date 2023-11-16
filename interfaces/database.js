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
   * @returns {result}
   */

  /**
   * Get an account by username
   * @public
   * @async
   * @method
   * @name getAccount
   * @param {string} username The username of the account
   * @returns {{id: string, password: string, isAdmin: boolean }}
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
   * @returns {result}
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
   * @returns {result}
   */

  /**
   * delete a file from the DB
   * @public
   * @async
   * @method
   * @name deleteFile
   * @param {string} id The file ID
   * @param {string} username the username trying to delete the file
   * @returns {result}
   */

  /**
   * @typedef {{ succeeded: boolean, code: number, data?: object }} result
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
