import createError from 'http-errors'
import { Log } from 'cmd430-utils'
import { extname } from 'node:path'
import { getAzureBlobStream } from '../../utils/azureBlobStorage.js'
import { mimetypeFilter } from '../../utils/mimetype.js'

// eslint-disable-next-line no-unused-vars
const { log, debug, info, warn, error } = new Log('Albums (GET)')

// TODO: Downloads

export default function (fastify, opts, done) {

  // Get album by ID
  fastify.get('/a/:id', async (req, reply) => {
    const { id } = req.params
    const album = fastify.betterSqlite3
      .prepare('SELECT title, uploaded_by FROM album WHERE id = ?')
      .get(id)

    if (!album) return createError(404)

    const albumFiles = fastify.betterSqlite3
      .prepare('SELECT id, file, type FROM albumFiles WHERE album = ?')
      .all(id)

    const { title, uploaded_by } = album
    const files = albumFiles
      .map(file => ({
        path: `/f/${file.id}${extname(file.file)}`,
        ...file,
        type: mimetypeFilter(file.type)
      }))

    return reply.view('album', {
      album: {
        id: id,
        title: title,
        files: files,
        uploaded_by: uploaded_by
      },
      openGraph: {
        title: title,
        description: `An Album Hosted at ${reply.locals.title}`,
        isAlbum: true
      }
    })
  })

  // Get album thumbnail
  fastify.get('/a/:id/thumbnail', async (req, reply) => {
    const { id } = req.params
    const dbResult = fastify.betterSqlite3
      .prepare('SELECT thumbnail, uploaded_by FROM album WHERE id = ?')
      .get(id)

    if (!dbResult) return createError(404)

    const { thumbnail, uploaded_by } = dbResult

    return reply
      .type('image/webp')
      .send(await getAzureBlobStream(uploaded_by, thumbnail))
  })

  done()
}
