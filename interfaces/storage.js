import { basename, extname } from 'node:path'
import { Log } from 'cmd430-utils'

// eslint-disable-next-line no-unused-vars
const { log, debug, info, warn, error } = new Log('Storage')

/**
 * @private
 */
export class StorageInterfaceBase {

  /**
   * @param {object} opts Options for the Storage Interface
   * @param {string} [opts.thumbnailExt=".webp"] Thumbnail file extention (including leading '.')
   */
  constructor (opts) {
    this.thumbnailExt = opts?.thumbnailExt ?? '.webp'
  }

  /**
   * Create the storage container for a user
   * @param {string} username
   */
  // eslint-disable-next-line
  createContainer (username) {}

  /**
   * Create unique filenames for file AND its thumbnail
   * @param {string} username
   * @param {string} filename
   * @returns {{filename: string, thumbnailFilename: string}}
   */
  // eslint-disable-next-line
  create (username, filename) {}

  /**
   * Set the file AND thumbnail data for a file
   * @param {object} data
   * @param {string} data.username The Username for the upload
   * @param {object} data.file
   * @param {string} data.file.filename The name of the file
   * @param {Buffer} data.file.fileData The file data
   * @param {object} data.thumbnail
   * @param {string} data.thumbnail.filename The name of the thumbnail
   * @param {Buffer} data.thumbnail.fileData The thumbnail data
   */
  // eslint-disable-next-line
  async write (data) {}

  /**
   * Read a file OR thumbnail from storage
   * @param {string} username The Username for the upload
   * @param {string} file The file id for the file or the thumbnail id for the thumbnail
   * @param {object} [range]
   * @param {number} range.offset The file offset in bytes to start reading
   * @param {number|undefined} range.count The amount in bytes of the file to read
   * @returns ReadStream
   */
  // eslint-disable-next-line
  async read (username, file, range = {}) {}

  // Delete a file AND its thumbnial from the store
  // eslint-disable-next-line
  async delete () {}

  /**
   * Get the thumbnail name from a file
   * @protected
   * @param {string} filename the name of the file to get the thumbnail path for
   * @returns {string}
   */
  deriveThumbnail (filename) {
    return `thumbnail/thumbnail_${basename(filename, extname(filename))}${this.thumbnailExt}`
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
