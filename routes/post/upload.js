import { customAlphabet } from 'nanoid'
import { Log } from 'cmd430-utils'
import { createAzureBlob, setAzureBlob } from '../../utils/azureBlobStorage.js'
import generateThumbnail from '../../utils/generateThumbnail.js'

// eslint-disable-next-line no-unused-vars
const { log, debug, info, warn, error } = new Log('Upload')
const nanoid = customAlphabet('123456789ABCDEFGHJKLMNPQRSTUVWXYZ_abcdefghijkmnpqrstuvwxyz-')

export default function (fastify, opts, done) {

  // Upload a file
  fastify.post('/upload', async (req, reply) => {
    const files = req.files()
    const fileIDs = []
    const albumID = files.length > 1 ? nanoid(8) : null

    // TODO albumID bound to uploads
    for await (const file of files) {

      // TODO: get username from session
      const { fileBlobName, azureBlobClients } = createAzureBlob('testAccount', file.filename)

      const fileID = nanoid(8)
      const fileBuffer = await file.toBuffer()
      const thumbnailBuffer = await generateThumbnail(file.mimetype, fileBuffer)
      const ttl = parseInt(file.fields?.ttl?.value ?? 0) > 0 ? parseInt(file.fields.ttl.value) : null
      // TODO: get username from session
      const username = 'testAccount'
      // TODO: get isPrivate from upload
      const isPrivate = Number(false)

      fastify.betterSqlite3
        .prepare('INSERT INTO files (id, name, file, type, uploaded_at, uploaded_by, ttl, isPrivate) VALUES (?, ?, ?, ?, strftime(\'%Y-%m-%dT%H:%M:%fZ\'), ?, ?, ?)')
        .run(fileID, file.filename, fileBlobName, file.mimetype, username, ttl, isPrivate)

      await setAzureBlob(fileBuffer, thumbnailBuffer, azureBlobClients)

      // Make sure we can access the file ids after the upload
      fileIDs.push(fileID)
    }

    debug({
      albumID,
      fileIDs
    })

    if (fileIDs.length === 1) return reply.redirect(`/f/${fileIDs[0]}`)

    reply.redirect(`/a/${albumID}`)
  })

  done()
}
