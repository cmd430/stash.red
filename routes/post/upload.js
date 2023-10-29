import { customAlphabet } from 'nanoid'
import { Log } from 'cmd430-utils'
import createError from 'http-errors'
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
      if (!req.session.get('authenticated')) return createError(401)

      const files = req.files()
      const fileIDs = []

      let ttl = null
      let isPrivate = null

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

        if (ttl === null) ttl = parseInt(file.fields?.ttl?.value ?? 0) > 0 ? parseInt(file.fields.ttl.value) : null
        if (isPrivate === null) isPrivate = Number(false) // TODO: get isPrivate from upload payload


        fastify.betterSqlite3
          .prepare('INSERT INTO files (id, name, file, type, uploaded_at, uploaded_by, ttl, isPrivate) VALUES (?, ?, ?, ?, strftime(\'%Y-%m-%dT%H:%M:%fZ\'), ?, ?, ?)')
          .run(fileID, file.filename, fileBlobName, mimetype, username, ttl, isPrivate)

        await setAzureBlob(fileBuffer, thumbnailBuffer, azureBlobClients)

        // Make sure we can access the file ids after the upload
        fileIDs.push(fileID)
      }

      if (fileIDs.length === 0) { // no files uploaded
        debug('No files found in payload')
        return createError(400)
      }

      debug({ fileIDs })

      // Generate Album if muliple files
      // TODO: allow skipping this step if the upload flag is set to not generate albums
      if (fileIDs.length > 1) {
        const albumID = nanoid(8)

        debug({ albumID })

        const statement = fastify.betterSqlite3.prepare('UPDATE files SET inAlbum = ?, albumOrder = ? WHERE id = ?')
        const transaction = fastify.betterSqlite3.transaction((fIDs, aID) => fIDs.map((fID, index) => statement.run(aID, index, fID)))
        const updated = transaction(fileIDs, albumID)
          .reduce((accumulator, currentValue) => (accumulator += currentValue.changes), 0)

        fastify.betterSqlite3
          .prepare('INSERT INTO albums (id, title, uploaded_at, uploaded_by, ttl, isPrivate) VALUES (?, ?, strftime(\'%Y-%m-%dT%H:%M:%fZ\'), ?, ?, ?)')
          .run(albumID, albumID, username, ttl, isPrivate)

        debug('Added', updated, 'files to album')

        return reply.redirect(`/a/${albumID}`)
      }

      return reply.redirect(`/f/${fileIDs[0]}`)
    } catch (err) {
      error(err.stack)
      return createError(500)
    }
  })

  done()
}
