import { BlobServiceClient } from '@azure/storage-blob'
import StreamMeter from 'stream-meter'
import { Log } from 'cmd430-utils'
import { StorageInterfaceBase } from '../storage.js'
import { config } from '../../config/config.js'

// eslint-disable-next-line no-unused-vars
const { log, debug, info, warn, error } = new Log('Storage (Azure)')
const { storageConnectionString } = config.storage

export default class StorageInterface extends StorageInterfaceBase {

  /**
   * Create the storage container for a user
   * @public
   * @param {string} username
   */
  async createContainer (username) {
    const azureContainerClient = this.#getContainerClient(username)

    await azureContainerClient.create()
    debug('Container was created successfully.')
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

    const filesize = await this.#write(username, {
      filename: file.filename,
      stream: file.filestream
    })
    debug('File was Created successfully.')

    const thumbnailSize = await this.#write(username, {
      filename: thumbnail.filename,
      stream: thumbnail.filestream
    })
    debug('Thumbnail was Created successfully.')

    return {
      filesize: filesize,
      thumbnailSize: thumbnailSize
    }
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
    const { offset = 0, count = undefined } = range
    const blobClient = this.#getBlobClient(username, file)
    const { readableStreamBody } = await blobClient.download(offset, count, {
      onProgress: ({ loadedBytes: receivedBytes }) => debug(blobClient.containerName, blobClient.name, 'Bytes received', receivedBytes)
    })

    return readableStreamBody
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
   * Get the azure blob service client
   * @private
   * @returns {BlobServiceClient}
   */
  #getBlobServiceClient () { // eslint-disable-line class-methods-use-this
    return BlobServiceClient.fromConnectionString(storageConnectionString)
  }

  /**
   * Get the azure blob container client for a user
   * @private
   * @param {string} username The username
   * @returns {ContainerClient}
   */
  #getContainerClient (username) {
    return this.#getBlobServiceClient().getContainerClient(username.toLowerCase())
  }

  /**
   * Get the azure blob client for a file
   * @private
   * @param {string} username The username
   * @param {string} filename The filename
   * @returns {BlobClient}
   */
  #getBlobClient (username, filename) {
    return this.#getContainerClient(username).getBlockBlobClient(filename)
  }

  /**
   * Write a file to storage
   * @private
   * @param {string} username The username
   * @param {object} file
   * @param {string} filename The filename
   * @param {ReadStream} stream The file stream
   * @returns {number} the size of the written file
   */
  async #write (username, file) {
    const { filename, stream } = file
    const blobClient = this.#getBlobClient(username, filename)
    const meter = new StreamMeter()

    debug(`Uploading file to Azure storage as blob\n\tname: ${filename}:\n\tURL: ${blobClient.url}`)

    await blobClient.uploadStream(stream.pipe(meter), undefined, undefined, {
      onProgress: ({ loadedBytes: sentBytes }) => debug(blobClient.containerName, blobClient.name, 'Bytes sent', sentBytes)
    })

    return meter.bytes
  }

  /**
   * Delete a file from storage
   * @private
   * @param {string} username The Username for the upload
   * @param {string} file The file id for the file or the thumbnail id for the thumbnail
   * @returns {{ succeeded: boolean }}
   */
  async #delete (username, file) {
    const blobClient = this.#getBlobClient(username, file)
    const azureFileDeleteBlobResponse = await blobClient.deleteIfExists()

    return azureFileDeleteBlobResponse
  }

}
