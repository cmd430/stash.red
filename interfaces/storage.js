import { randomUUID } from 'node:crypto'
import { join, basename, extname } from 'node:path'
import { Log } from 'cmd430-utils'

// eslint-disable-next-line no-unused-vars
const { log, debug, info, warn, error } = new Log('Storage')

/**
 * Base class for StorageInterfaces
 * @interface
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
   * @name createContainer
   * @param {string} username
   */

  /**
   * Create unique filenames for file AND its thumbnail
   * @protected
   * @param {string} username
   * @param {string} filename
   * @returns {{filename: string, thumbnailFilename: string}}
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
   * Set the file AND thumbnail data for a file
   * @public
   * @async
   * @method
   * @name write
   * @param {object} data
   * @param {string} data.username The Username for the upload
   * @param {object} data.file
   * @param {string} data.file.filename The name of the file
   * @param {Buffer} data.file.fileData The file data
   * @param {object} data.thumbnail
   * @param {string} data.thumbnail.filename The name of the thumbnail
   * @param {Buffer} data.thumbnail.fileData The thumbnail data
   */

  /**
   * Read a file OR thumbnail from storage
   * @public
   * @async
   * @method
   * @name read
   * @param {string} username The Username for the upload
   * @param {string} file The file id for the file or the thumbnail id for the thumbnail
   * @param {object} [range]
   * @param {number} range.offset The file offset in bytes to start reading
   * @param {number|undefined} range.count The amount in bytes of the file to read
   * @returns {ReadStream}
   */

  /**
   * Delete a file AND its thumbnail from storage
   * @public
   * @async
   * @method
   * @name delete
   * @param {string} username
   * @param {string} file
   * @returns {boolean}
   */

  /**
   * Get the thumbnail name from a file
   * @protected
   * @param {string} filename the name of the file to get the thumbnail path for
   * @returns {string}
   */
  deriveThumbnail (filename) {
    return join(this.thumbnailDirectory, `thumbnail_${basename(filename, extname(filename))}${this.thumbnailExt}`)
  }

}

/**
 * @typedef { "file" | "azure" } interfaceTypes
 */
const interfaceTypes = {
  'file': 'fileStorage.js',
  'azure': 'azureStorage.js'
}

/**
 * @param {interfaceTypes} interfaceType
 * @returns {StorageInterface}
 */
export async function getStorageInterface (interfaceType) {
  const { default: storageInterface } = await import(`./storage/${interfaceTypes[interfaceType]}`)

  return storageInterface
}
