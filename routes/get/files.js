import { MIMEType } from 'node:util'
import { Log } from 'cmd430-utils'
import { extname } from 'node:path'
import { mimetypeFilter } from '../../utils/mimetype.js'

// eslint-disable-next-line no-unused-vars
const { log, debug, info, warn, error } = new Log('Files (GET)')

function toUpperCaseFirstLetter (str) {
  return `${str.charAt(0).toUpperCase()}${str.slice(1)}`
}

export default function (fastify, opts, done) {

  // Get uploaded file page by ID
  fastify.get('/f/:id', async (request, reply) => {
    const { id } = request.params
    const { succeeded , code, data } = await fastify.db.getFile(id)

    if (succeeded === false) return reply.error(code)

    const { file, type: unsafeType } = data
    const mimetype = mimetypeFilter(unsafeType)
    const type = new MIMEType(mimetype).type
    const description = t => {
      if (t === 'image') return `An ${toUpperCaseFirstLetter(t)}`
      if (t === 'audio') return toUpperCaseFirstLetter(t)
      if (t === 'video') return `A ${toUpperCaseFirstLetter(t)}`
      if (t === 'text') return `A ${toUpperCaseFirstLetter(t)} file`
    }
    const directPath = `/f/${id}${extname(file)}`

    return reply
      .disableCache()
      .view('file', {
        file: {
          id: id,
          path: directPath,
          ...data,
          type: mimetype
        },
        openGraph: {
          title: id,
          description: `${description(type)} Hosted at ${reply.locals.title}`,
          path: `${request.protocol}://${request.hostname}${directPath}`,
          mimetype: mimetype,
          [`is${toUpperCaseFirstLetter(type)}`]: true
        }
      })
  })

  // Get uploaded file by ID
  fastify.get('/f/:id.:ext', async (request, reply) => {
    const { id } = request.params
    const { succeeded , code, data } = await fastify.db.getFile(id)

    if (succeeded === false) return reply.error(code)

    const { file, type, uploadedBy, size } = data
    const { offset: offsetRaw = 0, count: countRaw = '' } = request.headers.range?.match(/(?<unit>bytes)=(?<offset>\d{0,})-(?<count>\d{0,})/).groups ?? {}
    const offset = (Number(offsetRaw) || 0)
    const count = (Number(countRaw) || (size - (offset + 1)))

    debug('Range:', request.headers.range, {
      offset: offset,
      count: count + 1,
      size: size,
      partial: (count !== size)
    })

    return reply
      .status((count !== size) ? 206 : 200)
      .type(mimetypeFilter(type))
      //.disableCache()
      .header('accept-ranges', 'bytes')
      .header('content-range', `bytes ${offset}-${count}/${size}`)
      .send(await fastify.storage.read(uploadedBy, file, {
        offset: offset,
        count: count + 1
      }))
  })

  // Get uploaded file thumbnail
  fastify.get('/f/:id/thumbnail', async (request, reply) => {
    const { id } = request.params
    const { succeeded , code, data } = await fastify.db.getThumbnail(id)

    if (succeeded === false) return reply.error(code)

    const { thumbnail, uploadedBy } = data

    return reply
      .type('image/webp')
      .send(await fastify.storage.read(uploadedBy, thumbnail))
  })

  // Download file
  fastify.get('/f/:id/download', async (request, reply) => {
    const { id } = request.params
    const { succeeded , code, data } = await fastify.db.getFile(id)

    if (succeeded === false) return reply.error(code)

    const { type, uploadedBy, file } = data
    const filename = `${id}${extname(file)}`

    return reply
      .type(type)
      .header('content-disposition', `attachment; filename=${filename}`)
      .send(await fastify.storage.read(uploadedBy, file))
  })

  done()
}
