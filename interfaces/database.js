import { Log } from 'cmd430-utils'

// eslint-disable-next-line no-unused-vars
const { log, debug, info, warn, error } = new Log('Database')

/**
 * Base class for DatabaseInterface
 */
export class DatabaseInterfaceBase {
  /**
   * Connect to the database
   * @public
   * @async
   * @method
   * @name DatabaseInterfaceBase#connect
   */

  /**
   * add a new account to the db
   * @public
   * @async
   * @method
   * @name DatabaseInterfaceBase#createAccount
   * @param {object} data
   * @param {string} data.id The account ID
   * @param {string} data.username The account username
   * @param {string} data.email The account email
   * @param {string} data.password The hashed account password
   * @param {boolean|0|1} [data.isAdmin=false] if the account is an admin
   * @returns {createAccountResult}
   */
  /**
   * @typedef {object} createAccountResult
   * @property {boolean} succeeded
   * @property {'OK'|number} code if succeeded = false the error code to use for response or the string OK if succeeded = true
   */

  /**
   * Get an account by username
   * @public
   * @async
   * @method
   * @name DatabaseInterfaceBase#getAccount
   * @param {string} username The username of the account
   * @returns {getAccountResult}
   */
  /**
   * @typedef {object} getAccountResult
   * @property {string} id The unique id for the account
   * @property {string} password The hashed password of the account
   * @property {string} secret The 2fa secret for the account
   * @property {boolean} isAdmin A boolean indicating if the account is an admin user
   */

  /**
   * Enable 2FA for an account by username
   * @public
   * @async
   * @method
   * @name DatabaseInterfaceBase#enable2FA
   * @param {string} username The username of the account
   * @param {string} secret The 2fa secret
   * @returns {boolean}
   */

  /**
   * Add a file
   * @public
   * @async
   * @method
   * @name DatabaseInterfaceBase#addFile
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
   * @returns {addFileResult}
   */
  /**
   * @typedef {object} addFileResult
   * @property {boolean} succeeded
   * @property {'OK'|number} code if succeeded = false the error code to use for response or the string OK if succeeded = true
   */

  /**
   * Get a file
   * @public
   * @async
   * @method
   * @name DatabaseInterfaceBase#getFile
   * @param {string} id The file id
   * @returns {getFileResult}
   */
  /**
   * @typedef {object} getFileResult
   * @property {boolean} succeeded
   * @property {'OK'|number} code if succeeded = false the error code to use for response or the string OK if succeeded = true
   * @property {object} [data] returned data if succeeded = true
   * @property {string} data.file the identifier of the file in storage
   * @property {string} data.type the mimetype of the file
   * @property {string} data.uploadedBy the file uploaders username
   * @property {number} data.size the size in bytes of the file
   */

  /**
   * delete a file from the DB
   * @public
   * @async
   * @method
   * @name DatabaseInterfaceBase#deleteFile
   * @param {string} id The file ID
   * @param {string} username the username trying to delete the file
   * @returns {deleteFileResult}
   */
  /**
   * @typedef {object} deleteFileResult
   * @property {boolean} succeeded
   * @property {'OK'|number} code if succeeded = false the error code to use for response or the string OK if succeeded = true
   * @property {object} [data] returned data if succeeded = true
   * @property {string} data.file the identifier of the file in storage
   */

  /**
   * Create album and add files to it
   * @public
   * @async
   * @method
   * @name DatabaseInterfaceBase#createAlbum
   * @param {object} data
   * @param {string} data.id The album id
   * @param {string} data.name The name of the uploaded file
   * @param {string} data.uploadedBy The username of the uploader
   * @param {number|null} data.uploadedAt The upload date & time an ablum was uploaded
   * @param {number|null} data.uploadedUntil The date an ablum is uploaded until or null for infinity
   * @param {boolean} data.isPrivate If the file is hidden from the user page for others
   * @returns {createAlbumResult}
   */
  /**
   * @typedef {object} createAlbumResult
   * @property {boolean} succeeded
   * @property {'OK'|number} code if succeeded = false the error code to use for response or the string OK if succeeded = true
   */

  /**
   * Get an album and its files
   * @public
   * @async
   * @method
   * @name DatabaseInterfaceBase#getAlbum
   * @param {string} id The album id
   * @returns {getAlbumResult}
   */
  /**
   * @typedef {object} getAlbumResult
   * @property {boolean} succeeded
   * @property {'OK'|number} code if succeeded = false the error code to use for response or the string OK if succeeded = true
   * @property {object} [data] returned data if succeeded = true
   * @property {string} data.title the title of the album
   * @property {string} data.uploadedBy the album uploaders username
   * @property {object[]} data.files array of files in the album
   * @property {string} data.files.id the id of the file
   * @property {string} data.files.file the identifier of the file in storage
   * @property {string} data.files.type the mimetype of the file
   * @property {number} data.files.order the order of the file in the album
   */

  /**
   * delete an album from the DB
   * @public
   * @async
   * @method
   * @name DatabaseInterfaceBase#deleteAlbum
   * @param {string} id The album ID
   * @param {string} username the username trying to delete the album
   * @returns {deleteAlbumResult}
   */
  /**
   * @typedef {object} deleteAlbumResult
   * @property {boolean} succeeded
   * @property {'OK'|number} code if succeeded = false the error code to use for response or the string OK if succeeded = true
   * @property {object} [data] returned data if succeeded = true
   * @property {string[]} data.files array of file identifiers for the deleted files in storage
   */

  /**
   * update an albums title or file order
   * @public
   * @async
   * @method
   * @name DatabaseInterfaceBase#editAlbum
   * @param {string} id The id of the album
   * @param {string} username The user trying to edit the album
   * @param {object} payload
   * @param {string} [payload.title] The new title to set for the album
   * @param {object} [payload.order] and object of `fileID: albumOrders` for the album
   * @returns {editAlbumResult}
   */
  /**
   * @typedef {object} editAlbumResult
   * @property {boolean} succeeded
   * @property {'OK'|number} code if succeeded = false the error code to use for response or the string OK if succeeded = true
   */

  /**
   * Get a file or albums thumbnail
   * @public
   * @async
   * @method
   * @name DatabaseInterfaceBase#getThumbnail
   * @param {string} id The file/album id
   * @returns {getThumbnailResult}
   */
  /**
   * @typedef {object} getThumbnailResult
   * @property {boolean} succeeded
   * @property {'OK'|number} code if succeeded = false the error code to use for response or the string OK if succeeded = true
   * @property {object} [data] returned data if succeeded = true
   * @property {string} data.uploadedBy the uploaders username of the thumbnail
   * @property {string} data.thumbnail the file identifier of the thumbnail
   */

  /**
   * Get user files
   * @public
   * @async
   * @method
   * @name DatabaseInterfaceBase#getUserFiles
   * @param {string} username The username to get the files for
   * @param {object} options
   * @param {number} options.offset the offset for pagination
   * @param {number} options.limit the max amount of items to return
   * @param {'ASC'|'DESC'} options.order the order of the items
   * @param {string} options.filter the filetype filter
   * @param {boolean} options.includePrivate if we should return private files
   * @returns {getUserFilesResult}
   */
  /**
   * @typedef {object} getUserFilesResult
   * @property {boolean} succeeded
   * @property {'OK'|number} code if succeeded = false the error code to use for response or the string OK if succeeded = true
   * @property {object} [data] returned data if succeeded = true
   * @property {string} data.email the email of the user
   * @property {object[]} data.files array of files the user has uploaded
   * @property {string} data.files.id the id of the file
   * @property {string} data.files.type the mimetype of the file
   * @property {0|1|boolean} data.files.isPrivate if the file is private or not
   * @property {number} data.total the total number of files the user has uploaded
   */

  /**
   * Get user albums
   * @public
   * @async
   * @method
   * @name DatabaseInterfaceBase#getUserAlbums
   * @param {string} username The username to get the albums for
   * @param {object} options
   * @param {number} options.offset the offset for pagination
   * @param {number} options.limit the max amount of items to return
   * @param {'ASC'|'DESC'} options.order the order of the items
   * @param {boolean} options.includePrivate if we should return private albums
   * @returns {getUserAlbumsResult}
   */
  /**
   * @typedef {object} getUserAlbumsResult
   * @property {boolean} succeeded
   * @property {'OK'|number} code if succeeded = false the error code to use for response or the string OK if succeeded = true
   * @property {object} [data] returned data if succeeded = true
   * @property {string} data.email the email of the user
   * @property {object[]} data.albums array of albums the user has uploaded
   * @property {string} data.albums.id the id of the album
   * @property {string} data.albums.title the title of the album
   * @property {0|1|boolean} data.albums.isPrivate if the file is private or not
   * @property {number} data.albums.entries the total number of files in the album
   * @property {number} data.total the total number of albums the user has uploaded
   */

  /**
   * Remove uploads from the DB where the uploadedUntil has expired
   * @public
   * @async
   * @method
   * @name DatabaseInterfaceBase#cleanExpired
   * @returns {cleanExpiredResult}
   */
  /**
   * @typedef {object} cleanExpiredResult
   * @property {boolean} succeeded
   * @property {'OK'|number} code if succeeded = false the error code to use for response or the string OK if succeeded = true
   * @property {object} [data] returned data if succeeded = true
   * @property {object[]} data.expired array of expired files
   * @property {string} data.expired.file the identifier of the file
   * @property {string} data.expired.uploadedBy the username of the uploader
   */
}

/**
 * @typedef {"sqlite"} interfaceTypes
 */
/**
 * @typedef {DatabaseInterfaceBase} DatabaseInterface
 */
/**
 * @param {interfaceTypes} interfaceType
 * @returns {DatabaseInterface}
 */
export async function getDatabaseInterface (interfaceType) {
  const { default: databaseInterface } = await import(`./database/${interfaceType}Database.js`)

  return databaseInterface
}
