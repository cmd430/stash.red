import createError from 'http-errors'
import { Log } from 'cmd430-utils'
import { extname } from 'node:path'
import { getAzureBlobBuffer } from '../../utils/azureBlobStorage.js'

// eslint-disable-next-line no-unused-vars
const { log, debug, info, warn, error } = new Log('Albums (GET)')

// TODO: Downloads

export default function (fastify, opts, done) {

  function preHandler (req, reply, done) {
    // Anything that needs doing on all routes can go here

    done()
  }

  // Get album by ID
  fastify.get('/a/:id', { preHandler }, async (req, reply) => {
    const { id } = req.params
    const album = fastify.betterSqlite3
      .prepare('SELECT title FROM album WHERE id = ?')
      .get(id)

    if (!album) return createError(404)

    const albumFiles = fastify.betterSqlite3
      .prepare('SELECT id, file, type FROM albumFiles WHERE album = ?')
      .all(id)

    const { title } = album
    const files = albumFiles.map(file => ({
      path: `/f/${file.id}${extname(file.file)}`,
      ...file
    }))

    return reply.view('album', {
      album: {
        id: id,
        title: title,
        files: files
      },
      openGraph: {
        title: title,
        description: `An Album Hosted at ${reply.locals.title}`,
        isAlbum: true
      }
    })
  })

  // Get album thumbnail
  fastify.get('/a/:id/thumbnail', { preHandler }, async (req, reply) => {
    const { id } = req.params
    const dbResult = fastify.betterSqlite3
      .prepare('SELECT thumbnail, uploaded_by FROM album WHERE id = ?')
      .get(id)

    if (!dbResult) return createError(404)

    const { thumbnail, uploaded_by } = dbResult

    return reply
      .type('image/webp')
      .send(await getAzureBlobBuffer(uploaded_by, thumbnail))
  })

  done()
}
