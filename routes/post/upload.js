import { customAlphabet } from 'nanoid'
import { Log } from 'cmd430-utils'
import createError from 'http-errors'
import { createAzureBlob, setAzureBlob } from '../../utils/azureBlobStorage.js'
import generateThumbnail from '../../utils/generateThumbnail.js'

// eslint-disable-next-line no-unused-vars
const { log, debug, info, warn, error } = new Log('Upload')
const nanoid = customAlphabet('123456789ABCDEFGHJKLMNPQRSTUVWXYZ_abcdefghijkmnpqrstuvwxyz-')

export default function (fastify, opts, done) {

  // Upload a file
  fastify.post('/upload', async (req, reply) => {
    if (!req.session.get('authenticated')) return createError(401)
    const files = req.files()
    const fileIDs = []

    const username = req.session.get('user').username

    for await (const file of files) {
      const { fileBlobName, azureBlobClients } = createAzureBlob(username, file.filename)
      const fileID = nanoid(8)

      const fileBuffer = await file.toBuffer()
      const thumbnailBuffer = await generateThumbnail(file.mimetype, fileBuffer)
      const ttl = parseInt(file.fields?.ttl?.value ?? 0) > 0 ? parseInt(file.fields.ttl.value) : null
      // TODO: get isPrivate from upload payload
      const isPrivate = Number(false)

      fastify.betterSqlite3
        .prepare('INSERT INTO files (id, name, file, type, uploaded_at, uploaded_by, ttl, isPrivate) VALUES (?, ?, ?, ?, strftime(\'%Y-%m-%dT%H:%M:%fZ\'), ?, ?, ?)')
        .run(fileID, file.filename, fileBlobName, file.mimetype, username, ttl, isPrivate)

      await setAzureBlob(fileBuffer, thumbnailBuffer, azureBlobClients)

      // Make sure we can access the file ids after the upload
      fileIDs.push(fileID)
    }

    debug({ fileIDs })

    // Generate Album if muliple files
    if (fileIDs.length > 1) {
      const albumID = nanoid(8)

      debug({ albumID })

      const statement = fastify.betterSqlite3.prepare('UPDATE files SET inAlbum = ? WHERE id = ?')
      const transaction = fastify.betterSqlite3.transaction((fIDs, aID) => fIDs.map(fID => statement.run(aID, fID)))
      const updated = transaction(fileIDs, albumID)
        .reduce((accumulator, currentValue) => (accumulator += currentValue.changes), 0)

      debug('Added', updated, 'files to album')

      return reply.redirect(`/a/${albumID}`)
    }

    return reply.redirect(`/f/${fileIDs[0]}`)
  })

  done()
}
