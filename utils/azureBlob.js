import { randomUUID } from 'node:crypto'
import { basename, extname } from 'node:path'
import { BlobServiceClient } from '@azure/storage-blob'
import { Log } from 'cmd430-utils'
import { config } from './config.js'

// eslint-disable-next-line no-unused-vars
const { log, debug, info, warn, error } = new Log('Azure')
const { storageConnectionString } = config.azure

function streamToBuffer (readableStream) {
  return new Promise((resolve, reject) => {
    const chunks = []
    readableStream.on('data', data => {
      chunks.push(data instanceof Buffer ? data : Buffer.from(data))
    })
    readableStream.on('end', () => {
      resolve(Buffer.concat(chunks))
    })
    readableStream.on('error', reject)
  })
}

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

  debug(`\nUploading file to Azure storage as blob\n\tname: ${fileBlobName}:\n\tURL: ${azureContainerClient.url}`)
  debug(`\nUploading thumbnail to Azure storage as blob\n\tname: ${thumbnailBlobName}:\n\tURL: ${azureContainerClient.url}`)

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

  debug(`File Blob was uploaded successfully. requestId: ${azureFileUploadBlobResponse.requestId}`)
  debug(`Thumbnail Blob was uploaded successfully. requestId: ${azureThumbnailUploadBlobResponse.requestId}`)
}

export async function getAzureBlobBuffer (username, blobID) {
  const azureContainerClient = azureBlobServiceClient.getContainerClient(username.toLowerCase())
  const azureFileBlockBlobClient = azureContainerClient.getBlockBlobClient(blobID)
  const azureDownloadBlockBlobResponse = await azureFileBlockBlobClient.download()

  return streamToBuffer(azureDownloadBlockBlobResponse.readableStreamBody)
}

export async function deleteAzureBlob (username, blobID) {
  const azureContainerClient = azureBlobServiceClient.getContainerClient(username.toLowerCase())
  const azureFileBlockBlobClient = azureContainerClient.getBlockBlobClient(blobID)

  await azureFileBlockBlobClient.deleteIfExists()
}
