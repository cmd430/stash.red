import { extname } from 'node:path'
import { customAlphabet } from 'nanoid'
import { Log } from 'cmd430-utils'
import { createAzureBlob, setAzureBlob } from '../../utils/azureBlobStorage.js'
import generateThumbnail from '../../utils/generateThumbnail.js'
import { getMimetype, isValidMimetype } from '../../utils/mimetype.js'

// eslint-disable-next-line no-unused-vars
const { log, debug, info, warn, error } = new Log('Upload')
const nanoid = customAlphabet('123456789ABCDEFGHJKLMNPQRSTUVWXYZ_abcdefghijkmnpqrstuvwxyz-')

export default function (fastify, opts, done) {

  // Upload a file
  fastify.post('/upload', async (req, reply) => {
    try {
      if (!req.session.get('authenticated')) return {
        status: 401,
        message: 'You must be logged in to upload files'
      }

      const files = req.files()
      const fileIDs = []
      const fileExts = []

      let timeToLive = null
      let isPrivate = null
      let dontFormAlbum = null

      const { username } = req.session.get('session')

      for await (const file of files) {
        const fileBuffer = await file.toBuffer()

        if (fileBuffer instanceof Buffer === false || fileBuffer.byteLength === 0) {
          debug('Skipping file with no data')
          continue
        }

        const mimetype = getMimetype(fileBuffer)

        if (isValidMimetype(mimetype) === false) {
          debug('Skipping file with invalid mimetype: ', mimetype)
          continue
        }

        const thumbnailBuffer = await generateThumbnail(mimetype, fileBuffer)
        const { fileBlobName, azureBlobClients } = createAzureBlob(username, file.filename)
        const fileID = nanoid(8)

        if (timeToLive === null) timeToLive = Number(file.fields.timeToLive.value) || null
        if (isPrivate === null) isPrivate = Number(file.fields.isPrivate.value) ?? 0
        if (dontFormAlbum === null) dontFormAlbum = Number(file.fields.dontFormAlbum.value) ?? 0

        fastify.betterSqlite3
          .prepare('INSERT INTO files (id, name, file, size, type, uploaded_by, ttl, isPrivate) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
          .run(fileID, file.filename, fileBlobName, fileBuffer.byteLength, mimetype, username, timeToLive, isPrivate)

        await setAzureBlob(fileBuffer, thumbnailBuffer, azureBlobClients)

        // Make sure we can access the file ids after the upload
        fileIDs.push(fileID)
        fileExts.push(extname(file.filename))
      }

      if (fileIDs.length === 0) { // no files uploaded
        debug('No valid files found in payload')

        return {
          status: 400,
          message: 'No valid files found in payload'
        }
      }

      debug({ fileIDs })

      // If muliple files but `dontFormAlbum` is true then we dont form the album and send the user to their user page
      if (dontFormAlbum && fileIDs.length > 1) return {
        status: 201,
        path: `/u/${username}`
      }

      // Generate Album if muliple files
      if (fileIDs.length > 1) {
        const albumID = nanoid(8)

        debug({ albumID })

        const statement = fastify.betterSqlite3.prepare('UPDATE files SET inAlbum = ?, albumOrder = ? WHERE id = ?')
        const transaction = fastify.betterSqlite3.transaction((fIDs, aID) => fIDs.map((fID, index) => statement.run(aID, index, fID)))
        const updated = transaction(fileIDs, albumID)
          .reduce((accumulator, currentValue) => (accumulator += currentValue.changes), 0)

        fastify.betterSqlite3
          .prepare('INSERT INTO albums (id, title, uploaded_by, ttl, isPrivate) VALUES (?, ?, ?, ?, ?)')
          .run(albumID, 'Untitled Album', username, timeToLive, isPrivate)

        debug('Added', updated, 'files to album')

        return {
          status: 201,
          path: `/a/${albumID}`
        }
      }

      // Single File
      return {
        status: 201,
        path: `/f/${fileIDs[0]}`,
        direct: `/f/${fileIDs[0]}${fileExts[0]}`
      }
    } catch (err) {
      error(err.stack)

      return {
        status: 500,
        message: 'Something went wrong'
      }
    }
  })

  done()
}
