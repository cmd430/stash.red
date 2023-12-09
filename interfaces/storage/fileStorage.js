import { resolve, join } from 'node:path'
import { mkdir, access, constants, unlink } from 'node:fs/promises'
import { createReadStream, createWriteStream } from 'node:fs'
import { pipeline } from 'node:stream/promises'
import { Log } from 'cmd430-utils'
import { StorageInterfaceBase } from '../storage.js'

// eslint-disable-next-line no-unused-vars
const { log, debug, info, warn, error } = new Log('Storage (File)')

/**
 * @extends {StorageInterfaceBase}
 */
export default class StorageInterface extends StorageInterfaceBase {

  #baseStoragePath = resolve('./storage/')

  /**
   * Create the storage container for a user
   * @public
   * @override
   * @param {string} username
   */
  async createContainer (username) {
    const containerPath = join(this.#baseStoragePath, username.toLowerCase())

    await mkdir(join(containerPath, this.thumbnailDirectory), {
      recursive: true
    })

    debug(`Container was created successfully.\n\tPath: ${containerPath}`)
  }

  /**
   * Set the file AND thumbnail data for a file
   * @public
   * @param {object} data
   * @param {string} data.username The Username for the upload
   * @param {object} data.file
   * @param {string} data.file.filename The name of the file
   * @param {ReadStream} data.file.filestream The file data stream
   * @param {object} data.thumbnail
   * @param {string} data.thumbnail.filename The name of the thumbnail
   * @param {ReadStream} data.thumbnail.filestream The thumbnail data stream
   * @returns {{
   *  filesize: number,
   *  thumbnailSize: number
   * }} the size of the written file and thumbnail
   */
  async write (data) {
    const { username, file, thumbnail } = data
    const { filename, filestream } = file
    const { filename: thumbnailFilename, filestream: thumbnailStream } = thumbnail

    const filePath = this.#formatFilePath(username, filename)
    const thumbnailPath = this.#formatFilePath(username, thumbnailFilename)

    const writeFile = createWriteStream(filePath)
    const writeThumbnail = createWriteStream(thumbnailPath)

    await pipeline(filestream, writeFile)
    debug('File was Created successfully.')

    await pipeline(thumbnailStream, writeThumbnail)
    debug('Thumbnail was Created successfully.')

    return {
      filesize: writeFile.bytesWritten,
      thumbnailSize: writeThumbnail.bytesWritten
    }
  }

  /**
   * Read a file OR thumbnail from storage
   * @public
   * @param {string} username The Username for the upload
   * @param {string} file The file id for the file or the thumbnail id for the thumbnail
   * @param {object} [opts]
   * @param {number} opts.signal The abort controler signal
   * @param {number} opts.range.offset The file offset in bytes to start reading
   * @param {number|undefined} opts.range.count The amount in bytes of the file to read
   * @returns {ReadStream}
   */
  async read (username, file, opts = {}) {
    const { range = {} } = opts
    const { offset = 0, count = undefined } = range

    return createReadStream(this.#formatFilePath(username, file), {
      start: offset,
      end: count
    })
  }

  /**
   * Delete a file AND its thumbnail from storage
   * @public
   * @param {string} username
   * @param {string} file
   * @returns {boolean}
   */
  async delete (username, file) {
    const { succeeded: fileDeleteResult } = await this.#delete(username, file)
    const { succeeded: thumbnailDeleteResult } = await this.#delete(username, this.deriveThumbnail(file))

    debug('File was', fileDeleteResult ? 'deleted successfully.' : 'unable to be deleted.')
    debug('Files Thumbnail was', thumbnailDeleteResult ? 'deleted successfully.' : 'unable to be deleted.')

    return [
      fileDeleteResult,
      thumbnailDeleteResult
    ].every(result => result === true)
  }

  /**
   * Delete a file from storage
   * @private
   * @param {string} username The Username for the upload
   * @param {string} file The file id for the file or the thumbnail id for the thumbnail
   * @returns {{ succeeded: boolean }}
   */
  async #delete (username, file) {
    const filePath = this.#formatFilePath(username, file)

    try {
      await access(filePath, constants.F_OK)
      await unlink(filePath)

      return {
        succeeded: true
      }
    } catch {
      return {
        succeeded: false
      }
    }
  }

  /**
   * Return formatted filepath for a file OR thumbnail
   * @private
   * @param {string} username
   * @param {string} file
   * @returns {string}
   */
  #formatFilePath (username, file) {
    return join(this.#baseStoragePath, username.toLowerCase(), file)
  }

}
