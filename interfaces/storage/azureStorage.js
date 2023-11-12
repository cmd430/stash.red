import { randomUUID } from 'node:crypto'
import { basename, extname } from 'node:path'
import { BlobServiceClient } from '@azure/storage-blob'
import { Log } from 'cmd430-utils'
import { config } from '../../config/config.js'

// eslint-disable-next-line no-unused-vars
const { log, debug, info, warn, error } = new Log('Storage (Azure)')
const { storageConnectionString } = config.azure

// TODO: rewrite this into a `StorageInterface`

export function deriveThumbnailBlob (fileBlobName) {
  return `thumbnail/thumbnail_${basename(fileBlobName, extname(fileBlobName))}.webp`
}

const azureBlobServiceClient = BlobServiceClient.fromConnectionString(storageConnectionString)

export async function createAzureContainer (username) {
  const azureContainerClient = azureBlobServiceClient.getContainerClient(username.toLowerCase())
  const azureCreateContainerResponse = await azureContainerClient.create()

  debug(`Container was created successfully.\n\trequestId:${azureCreateContainerResponse.requestId}\n\tURL: ${azureContainerClient.url}`)
}

export function createAzureBlob (username, filename) {
  const azureContainerClient = azureBlobServiceClient.getContainerClient(username.toLowerCase())
  const fileBlobName = `${randomUUID()}${extname(filename)}`
  const thumbnailBlobName = deriveThumbnailBlob(fileBlobName)
  const azureFileBlockBlobClient = azureContainerClient.getBlockBlobClient(fileBlobName)
  const azureThumbnailBlockBlobClient = azureContainerClient.getBlockBlobClient(thumbnailBlobName)

  debug(`Uploading file to Azure storage as blob\n\tname: ${fileBlobName}:\n\tURL: ${azureContainerClient.url}`)
  debug(`Uploading thumbnail to Azure storage as blob\n\tname: ${thumbnailBlobName}:\n\tURL: ${azureContainerClient.url}`)

  return {
    fileBlobName,
    azureBlobClients: {
      azureFileBlockBlobClient,
      azureThumbnailBlockBlobClient
    }
  }
}

export async function setAzureBlob (fileBuffer, thumbnailBuffer, azureBlobClients) {
  const { azureFileBlockBlobClient, azureThumbnailBlockBlobClient } = azureBlobClients
  const azureFileUploadBlobResponse = await azureFileBlockBlobClient.upload(fileBuffer, fileBuffer.length)
  const azureThumbnailUploadBlobResponse = await azureThumbnailBlockBlobClient.upload(thumbnailBuffer, thumbnailBuffer.length)

  debug(`File Blob was uploaded successfully.\n\trequestId: ${azureFileUploadBlobResponse.requestId}`)
  debug(`Thumbnail Blob was uploaded successfully.\n\trequestId: ${azureThumbnailUploadBlobResponse.requestId}`)
}

export async function getAzureBlobStream (username, blobID, range = { offset: 0, count: undefined }) {
  const azureContainerClient = azureBlobServiceClient.getContainerClient(username.toLowerCase())
  const azureFileBlockBlobClient = azureContainerClient.getBlockBlobClient(blobID)
  const azureDownloadBlockBlobResponse = await azureFileBlockBlobClient.download(range.offset, range.count)

  return azureDownloadBlockBlobResponse.readableStreamBody
}

async function deleteAzureBlob (username, blobID) {
  const azureContainerClient = azureBlobServiceClient.getContainerClient(username.toLowerCase())
  const azureFileBlockBlobClient = azureContainerClient.getBlockBlobClient(blobID)
  const azureFileDeleteBlobResponse = await azureFileBlockBlobClient.deleteIfExists()

  return azureFileDeleteBlobResponse
}

export async function deleteAzureBlobWithThumbnail (username, blobID) {
  const azureFileDeleteBlobResponse = await deleteAzureBlob(username, blobID)
  const azureThumbnailDeleteBlobResponse = await deleteAzureBlob(username, deriveThumbnailBlob(blobID))

  debug(`File Blob was ${azureFileDeleteBlobResponse.succeeded ? 'deleted successfully.' : 'unabled to be deleted.'}\n\trequestId: ${azureFileDeleteBlobResponse.requestId}`)
  debug(`Files Thumbnail Blob was ${azureThumbnailDeleteBlobResponse.succeeded ? 'deleted successfully.' : 'unabled to be deleted.'}\n\trequestId: ${azureFileDeleteBlobResponse.requestId}`)

  const results = [
    azureFileDeleteBlobResponse.succeeded,
    azureFileDeleteBlobResponse.succeeded
  ]

  return results.every(result => result === true)
}
