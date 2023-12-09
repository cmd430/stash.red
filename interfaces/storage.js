import { randomUUID } from 'node:crypto'
import { join, basename, extname } from 'node:path'
import { Log } from 'cmd430-utils'

// eslint-disable-next-line no-unused-vars
const { log, debug, info, warn, error } = new Log('Storage')

/**
 * Base class for StorageInterfaces
 */
export class StorageInterfaceBase {

  /**
   * Constructor for StorageInterface with optional options
   * @param {object} opts Options for the Storage Interface
   * @param {string} [opts.thumbnailDirectory="thumbnail"] Thumbnail sub directory name
   * @param {string} [opts.thumbnailExt=".webp"] Thumbnail file extention (including leading '.')
   */
  constructor (opts) {
    /** @protected */ this.thumbnailExt = opts?.thumbnailExt ?? '.webp'
    /** @protected */ this.thumbnailDirectory = opts?.thumbnailDirectory ?? 'thumbnail'
  }

  /**
   * Create the storage container for a user
   * @public
   * @method
   * @name StorageInterfaceBase#createContainer
   * @param {string} username
   * @returns {void}
   */

  /**
   * Create unique filenames for file AND its thumbnail
   * @protected
   * @param {string} username
   * @param {string} filename
   * @returns {createResult} an object containing the identifiers for the file and thumbnail in storage
   */
  create (username, filename) {
    const storageFilename = `${randomUUID()}${extname(filename)}`
    const thumbnailFilename = this.deriveThumbnail(storageFilename)

    return {
      filename: storageFilename,
      thumbnailFilename: thumbnailFilename
    }
  }
  /**
   * @typedef {object} createResult
   * @property {string} filename The unique identifier for the file in storage
   * @property {string} thumbnailFilename The unique identifier for the thumbnail in storage
   */

  /**
   * Set the file AND thumbnail data for a file
   * @public
   * @async
   * @method
   * @name StorageInterfaceBase#write
   * @param {object} data
   * @param {string} data.username The Username for the upload
   * @param {object} data.file
   * @param {string} data.file.filename The name of the file
   * @param {ReadStream} data.file.filestream The file data stream
   * @param {object} data.thumbnail
   * @param {string} data.thumbnail.filename The name of the thumbnail
   * @param {ReadStream} data.thumbnail.filestream The thumbnail data stream
   * @returns {writeResult} the size of the written file and thumbnail
   */
  /**
   * @typedef {object} writeResult
   * @property {number} filesize The size of the file in bytes
   * @property {number} thumbnailSize The size of the thumbnail in bytes
   */

  /**
   * Read a file OR thumbnail from storage
   * @public
   * @async
   * @method
   * @name StorageInterfaceBase#read
   * @param {string} username The Username for the upload
   * @param {string} file The file id for the file or the thumbnail id for the thumbnail
   * @param {object} [opts]
   * @param {number} opts.signal The abort controler signal
   * @param {number} opts.range.offset The file offset in bytes to start reading
   * @param {number|undefined} opts.range.count The amount in bytes of the file to read
   * @returns {ReadStream} a readable stream of the files content
   */

  /**
   * Delete a file AND its thumbnail from storage
   * @public
   * @async
   * @method
   * @name StorageInterfaceBase#delete
   * @param {string} username
   * @param {string} file
   * @returns {boolean} boolean indicating if the file (and its thumbnail) was successfully deleted
   */

  /**
   * Get the thumbnail name from a file
   * @protected
   * @param {string} filename the name of the file to get the thumbnail path for
   * @returns {string} the unique identifier of the thumbnail based on the identifier of a file
   */
  deriveThumbnail (filename) {
    return join(this.thumbnailDirectory, `thumbnail_${basename(filename, extname(filename))}${this.thumbnailExt}`)
  }

}

/**
 * @typedef {"file"|"azure"} interfaceTypes
 */
/**
 * @typedef {StorageInterfaceBase} StorageInterface
 */
/**
 * @param {interfaceTypes} interfaceType
 * @returns {StorageInterface}
 */
export async function getStorageInterface (interfaceType) {
  const { default: storageInterface } = await import(`./storage/${interfaceType}Storage.js`)

  return storageInterface
}
