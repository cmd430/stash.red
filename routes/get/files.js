import createError from 'http-errors'
import { Log } from 'cmd430-utils'
import { extname } from 'node:path'
import { mimetypeFilter } from '../../utils/mimetype.js'
import { getAzureBlobStream } from '../../utils/azureBlobStorage.js'

// eslint-disable-next-line no-unused-vars
const { log, debug, info, warn, error } = new Log('Files (GET)')

export default function (fastify, opts, done) {

  // Get uploaded file page by ID
  fastify.get('/f/:id', async (request, reply) => {
    const { id } = request.params
    const dbResult = fastify.betterSqlite3
      .prepare('SELECT "file", "type", "uploadedBy" FROM "file" WHERE "id" = ?')
      .get(id)

    if (!dbResult) return createError(404)

    const { file, type: unsafeType } = dbResult
    const type = mimetypeFilter(unsafeType)
    const description = t => {
      t = t.split('/')[0]

      if (t === 'image') return `An ${t.charAt(0).toUpperCase()}${t.slice(1)}`
      if (t === 'audio') return `${t.charAt(0).toUpperCase()}${t.slice(1)}`
      if (t === 'video') return `A ${t.charAt(0).toUpperCase()}${t.slice(1)}`
      if (t === 'text') return `A ${t.charAt(0).toUpperCase()}${t.slice(1)} file`
    }
    const isType = t => {
      t = t.split('/')[0]

      return `${t.charAt(0).toUpperCase()}${t.slice(1)}`
    }
    const directPath = `/f/${id}${extname(file)}`

    return reply
      .disableCache()
      .view('file', {
        file: {
          id: id,
          path: directPath,
          ...dbResult,
          type: type
        },
        openGraph: {
          title: id,
          description: `${description(type)} Hosted at ${reply.locals.title}`,
          path: `${request.protocol}://${request.hostname}${directPath}`,
          mimetype: type,
          [`is${isType(type)}`]: true
        }
      })
  })

  // Get uploaded file by ID
  fastify.get('/f/:id.:ext', async (request, reply) => {
    const { id } = request.params
    const dbResult = fastify.betterSqlite3
      .prepare('SELECT "file", "type", "uploadedBy", "size" FROM "file" WHERE "id" = ?')
      .get(id)

    if (!dbResult) return createError(404)

    const { file, type, uploadedBy, size } = dbResult
    const { offset: offsetRaw, count: countRaw } = request.headers.range?.match(/(?<unit>bytes)=(?<offset>\d{0,})-(?<count>\d{0,})/).groups ?? { offset: 0, count: '' }
    const offset = (Number(offsetRaw) || 0)
    const count = (Number(countRaw) || (size - offset))

    debug('Range:', request.headers.range, {
      offset: offset,
      count: count,
      size: size,
      partial: (count !== size)
    })

    return reply
      .status((count !== size) ? 206 : 200)
      .type(mimetypeFilter(type))
      .header('accept-ranges', 'bytes')
      .header('content-range', `bytes ${offset}-${count}/${size}`)
      .send(await getAzureBlobStream(uploadedBy, file, {
        offset: offset,
        count: count
      }))
  })

  // Get uploaded file thumbnail
  fastify.get('/f/:id/thumbnail', async (request, reply) => {
    const { id } = request.params
    const dbResult = fastify.betterSqlite3
      .prepare('SELECT "thumbnail", "uploadedBy" FROM "file" WHERE "id" = ?')
      .get(id)

    if (!dbResult) return createError(404)

    const { thumbnail, uploadedBy } = dbResult

    return reply
      .type('image/webp')
      .send(await getAzureBlobStream(uploadedBy, thumbnail))
  })

  // Download file
  fastify.get('/f/:id/download', async (request, reply) => {
    const { id } = request.params
    const dbResult = fastify.betterSqlite3
      .prepare('SELECT "type", "uploadedBy", "file", "size" FROM "file" WHERE "id" = ?')
      .get(id)

    if (!dbResult) return createError(404)

    const { type, uploadedBy, file } = dbResult
    const filename = `${id}${extname(file)}`

    return reply
      .type(type)
      .header('content-disposition', `attachment; filename=${filename}`)
      .send(await getAzureBlobStream(uploadedBy, file))
  })

  done()
}
