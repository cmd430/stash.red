import createError from 'http-errors'
import { Log } from 'cmd430-utils'
import { extname } from 'node:path'
import mimetypeFilter from '../../utils/mimetypeFilter.js'
import { getAzureBlobBuffer, deleteAzureBlobWithThumbnail } from '../../utils/azureBlobStorage.js'

// eslint-disable-next-line no-unused-vars
const { log, debug, info, warn, error } = new Log('Files (GET)')

export default function (fastify, opts, done) {

  // TODO: Downloads

  function preHandler (req, reply, done) {
    // Anything that needs doing on all routes can go here

    done()
  }

  // TEMP: test file delete
  fastify.get('/f/:id/delete', { preHandler }, async (req, reply) => {
    const { id } = req.params
    const { file, uploaded_by } = fastify.betterSqlite3
      .prepare('SELECT file, uploaded_by FROM files WHERE id = ?')
      .get(id)

    if (await deleteAzureBlobWithThumbnail(uploaded_by, file)) {
      fastify.betterSqlite3
        .prepare('DELETE FROM files WHERE id = ?')
        .run(id)
    }

    return {
      message: 'blob deleted'
    }
  })
  // END


  // Get uploaded file page by ID
  fastify.get('/f/:id', { preHandler }, async (req, reply) => {
    const { id } = req.params
    const dbResult = fastify.betterSqlite3
      .prepare('SELECT file, type FROM file WHERE id = ?')
      .get(id)

    if (!dbResult) return createError(404)

    const { file, type } = dbResult
    const description = t => {
      t = t.split('/')[0]

      if (t === 'image') return `An ${t.charAt(0).toUpperCase()}${t.slice(1)}`
      if (t === 'audio') return `${t.charAt(0).toUpperCase()}${t.slice(1)}`
      if (t === 'video') return `A ${t.charAt(0).toUpperCase()}${t.slice(1)}`
      if (t === 'text') return `A ${t.charAt(0).toUpperCase()}${t.slice(1)} File`
    }
    const isType = t => {
      t = t.split('/')[0]

      return `${t.charAt(0).toUpperCase()}${t.slice(1)}`
    }
    const directPath = `${(reply.locals.base.endsWith('/') ? reply.locals.base.slice(0, -1) : reply.locals.base)}${extname(file)}`

    return reply.view('file', {
      file: { id, ...dbResult, path: directPath },
      openGraph: {
        title: id,
        description: `${description(type)} Hosted at ${reply.locals.title}`,
        [`is${isType(type)}`]: true,
        path: `${req.protocol}://${req.hostname}${directPath}`,
        mimetype: type
      }
    })
  })

  // Get uploaded file by ID
  fastify.get('/f/:id.:ext', { preHandler }, async (req, reply) => {
    const { id } = req.params
    const dbResult = fastify.betterSqlite3
      .prepare('SELECT file, type, uploaded_by FROM file WHERE id = ?')
      .get(id)

    if (!dbResult) return createError(404)

    const { file, type, uploaded_by } = dbResult

    return reply
      .type(mimetypeFilter(type))
      .send(await getAzureBlobBuffer(uploaded_by, file))
  })

  // Get uploaded file thumbnail
  fastify.get('/f/:id/thumbnail', { preHandler }, async (req, reply) => {
    const { id } = req.params
    const dbResult = fastify.betterSqlite3
      .prepare('SELECT thumbnail, uploaded_by FROM file WHERE id = ?')
      .get(id)

    if (!dbResult) return createError(404)

    const { thumbnail, uploaded_by } = dbResult

    return reply
      .type('image/webp')
      .send(await getAzureBlobBuffer(uploaded_by, thumbnail))
  })

  done()
}
