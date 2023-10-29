import createError from 'http-errors'
import { Log } from 'cmd430-utils'
import { extname } from 'node:path'
import { mimetypeFilter } from '../../utils/mimetype.js'
import { getAzureBlobBuffer, deleteAzureBlobWithThumbnail } from '../../utils/azureBlobStorage.js'

// eslint-disable-next-line no-unused-vars
const { log, debug, info, warn, error } = new Log('Files (GET)')

export default function (fastify, opts, done) {

  // TODO: Downloads

  // TEMP: test file delete
  fastify.get('/f/:id/delete', async (req, reply) => {
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
  fastify.get('/f/:id', async (req, reply) => {
    const { id } = req.params
    const dbResult = fastify.betterSqlite3
      .prepare('SELECT file, type, uploaded_by FROM file WHERE id = ?')
      .get(id)

    if (!dbResult) return createError(404)

    const { file, type: unsafeType } = dbResult
    const type = mimetypeFilter(unsafeType)
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
    const directPath = `/f/${id}${extname(file)}`

    return reply.view('file', {
      file: {
        id: id,
        path: directPath,
        ...dbResult,
        type: type
      },
      openGraph: {
        title: id,
        description: `${description(type)} Hosted at ${reply.locals.title}`,
        path: `${req.protocol}://${req.hostname}${directPath}`,
        mimetype: type,
        [`is${isType(type)}`]: true
      }
    })
  })

  // Get uploaded file by ID
  fastify.get('/f/:id.:ext', async (req, reply) => {
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
  fastify.get('/f/:id/thumbnail', async (req, reply) => {
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
