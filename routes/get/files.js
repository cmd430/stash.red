import createError from 'http-errors'
import { Log } from 'cmd430-utils'
import mimetypeFilter from '../../utils/mimetypeFilter.js'
import { getAzureBlobBuffer, deriveThumbnailBlob, deleteAzureBlob } from '../../utils/azureBlob.js'

// eslint-disable-next-line no-unused-vars
const { log, debug, info, warn, error } = new Log('Files (GET)')

// TODO: Add 404 etc error handling
// TODO: Respect isPrivate Flags
// TODO: have files served from subdomain
// TODO: File pages

export default function (fastify, opts, done) {

  // TEMP: test file delete
  fastify.get('/f/:id/delete', async (req, reply) => {
    const { id } = req.params

    const { file, uploaded_by } = fastify.betterSqlite3
      .prepare('SELECT file, uploaded_by FROM files WHERE id = ?')
      .get(id)

    await deleteAzureBlob(uploaded_by, file)

    return {
      message: 'blob deleted'
    }
  })
  // END

  // Get uploaded file by ID
  fastify.get('/f/:id', async (req, reply) => {
    const { id } = req.params

    const { file, type, uploaded_by, isPrivate } = fastify.betterSqlite3
      .prepare('SELECT file, type, uploaded_by, isPrivate FROM files WHERE id = ?')
      .get(id)

    reply.type(mimetypeFilter(type))
    reply.send(await getAzureBlobBuffer(uploaded_by, file))
  })

  // Get uploaded file thumbnail
  fastify.get('/f/:id/thumbnail', async (req, reply) => {
    const { id } = req.params
    const { file, uploaded_by, isPrivate } = fastify.betterSqlite3
      .prepare('SELECT file, uploaded_by, isPrivate FROM files WHERE id = ?')
      .get(id)

    reply.type('image/webp')
    reply.send(await getAzureBlobBuffer(uploaded_by, deriveThumbnailBlob(file)))
  })

  // Get info for uploaded file
  fastify.get('/f/:id/info', async (req, reply) => {
    const { id } = req.params

    return fastify.betterSqlite3
      .prepare('SELECT * FROM files WHERE id = ?')
      .get(id)
  })

  done()
}
