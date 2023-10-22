import { BlobServiceClient } from '@azure/storage-blob'
import { Log } from 'cmd430-utils'
import { config } from './config.js'

// eslint-disable-next-line no-unused-vars
const { log, debug, info, warn, error } = new Log('Azure')
const { storageConnectionString } = config.azure

export const blobServiceClient = BlobServiceClient.fromConnectionString(storageConnectionString)

