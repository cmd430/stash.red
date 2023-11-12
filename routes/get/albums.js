import createError from 'http-errors'
import { Log } from 'cmd430-utils'
import archiver from 'archiver'
import { extname } from 'node:path'
import { getAzureBlobStream } from '../../interfaces/storage/azureBlobStorage.js'
import { mimetypeFilter } from '../../utils/mimetype.js'

// eslint-disable-next-line no-unused-vars
const { log, debug, info, warn, error } = new Log('Albums (GET)')

export default function (fastify, opts, done) {

  // Get album by ID
  fastify.get('/a/:id', async (request, reply) => {
    const { id } = request.params
    const album = fastify.betterSqlite3
      .prepare('SELECT "title", "uploadedBy" FROM "album" WHERE "id" = ?')
      .get(id)

    if (!album) return createError(404)

    const albumFiles = fastify.betterSqlite3
      .prepare('SELECT "id", "file", "type", "order" FROM "albumFiles" WHERE "album" = ?')
      .all(id)

    const { title, uploadedBy } = album
    const files = albumFiles
      .map(file => ({
        path: `/f/${file.id}${extname(file.file)}`,
        ...file,
        type: mimetypeFilter(file.type)
      }))

    return reply
      .disableCache()
      .view('album', {
        album: {
          id: id,
          title: title,
          files: files,
          uploadedBy: uploadedBy
        },
        openGraph: {
          title: title,
          description: `An Album Hosted at ${reply.locals.title}`,
          isAlbum: true
        }
      })
  })

  // Get album thumbnail
  fastify.get('/a/:id/thumbnail', async (request, reply) => {
    const { id } = request.params
    const dbResult = fastify.betterSqlite3
      .prepare('SELECT "thumbnail", "uploadedBy" FROM "album" WHERE "id" = ?')
      .get(id)

    if (!dbResult) return createError(404)

    const { thumbnail, uploadedBy } = dbResult

    return reply
      .type('image/webp')
      .send(await getAzureBlobStream(uploadedBy, thumbnail))
  })

  // Download album
  fastify.get('/a/:id/download', async (request, reply) => {
    const { id } = request.params
    const album = fastify.betterSqlite3
      .prepare('SELECT "title", "uploadedBy" FROM "album" WHERE "id" = ?')
      .get(id)

    if (!album) return createError(404)

    const albumFiles = fastify.betterSqlite3
      .prepare('SELECT "id", "file", "order" FROM "albumFiles" WHERE "album" = ?')
      .all(id)

    const { title, uploadedBy } = album

    const archive = archiver('zip', {
      comment: `Album downloaded from ${reply.locals.title}`,
      store: true
    })

    for (const { id: fileID, file } of albumFiles) {
      archive.append(await getAzureBlobStream(uploadedBy, file), {
        name: `${fileID}${extname(file)}`
      })
    }

    archive.finalize()

    return reply
      .type('application/zip')
      .header('content-disposition', `attachment; filename=[${id}]${title}.zip`)
      .send(archive)
  })

  done()
}
