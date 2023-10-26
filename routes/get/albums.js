import createError from 'http-errors'
import { Log } from 'cmd430-utils'
import { getAzureBlobBuffer } from '../../utils/azureBlobStorage.js'

// eslint-disable-next-line no-unused-vars
const { log, debug, info, warn, error } = new Log('Albums (GET)')

// TODO: Album pages

export default function (fastify, opts, done) {

  // Get album by ID
  fastify.get('/a/:id', async (req, reply) => {
    const { id } = req.params
    const dbResult = fastify.betterSqlite3
      .prepare('SELECT uploaded_at, uploaded_by, title, files, entries, isPrivate FROM album WHERE id = ?')
      .get(id)

    if (!dbResult) return createError(404)

    const { uploaded_at, uploaded_by, title, files, entries, isPrivate } = dbResult

    debug({ uploaded_at, uploaded_by, title, files, entries, isPrivate })

    //TODO get the actual files from DB in the sorted order of the album

    return {
      message: 'WIP',
      album: id,
      data: dbResult
    }
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
      .send(await getAzureBlobBuffer(uploaded_by, thumbnail))
  })

  done()
}
