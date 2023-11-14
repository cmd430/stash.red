import { resolve, join } from 'node:path'
import { mkdir, writeFile, access, constants, unlink } from 'node:fs/promises'
import { createReadStream } from 'node:fs'
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
   * @param {Buffer} data.file.fileData The file data
   * @param {object} data.thumbnail
   * @param {string} data.thumbnail.filename The name of the thumbnail
   * @param {Buffer} data.thumbnail.fileData The thumbnail data
   */
  async write (data) {
    const { username, file, thumbnail } = data
    const { filename, fileData } = file
    const { filename: thumbnailFilename, fileData: thumbnailData } = thumbnail

    const filePath = this.#formatFilePath(username, filename)
    const thumbnailPath = this.#formatFilePath(username, thumbnailFilename)

    await writeFile(filePath, fileData)
    debug('File was Created successfully.')

    await writeFile(thumbnailPath, thumbnailData)
    debug('Thumbnail was Created successfully.')
  }

  /**
   * Read a file OR thumbnail from storage
   * @public
   * @param {string} username The Username for the upload
   * @param {string} file The file id for the file or the thumbnail id for the thumbnail
   * @param {object} [range]
   * @param {number} range.offset The file offset in bytes to start reading
   * @param {number|undefined} range.count The amount in bytes of the file to read
   * @returns {ReadStream}
   */
  async read (username, file, range = {}) {
    const { offset = 0, count = Infinity } = range

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

    debug('File was', fileDeleteResult ? 'deleted successfully.' : 'unabled to be deleted.')
    debug('Files Thumbnail was', thumbnailDeleteResult ? 'deleted successfully.' : 'unabled to be deleted.')

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
