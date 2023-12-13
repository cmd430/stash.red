import { Log } from 'cmd430-utils'
import archiver from 'archiver'
import { extname } from 'node:path'
import { mimetypeFilter } from '../../utils/mimetype.js'

// eslint-disable-next-line no-unused-vars
const { log, debug, info, warn, error } = new Log('Albums (GET)')

export default function (fastify, opts, done) {

  // Get album by ID
  fastify.get('/a/:id', async (request, reply) => {
    const { id } = request.params
    const { succeeded , code, data } = await fastify.db.getAlbum(id)

    if (succeeded === false) return reply.error(code)

    const { title, uploadedBy, files } = data

    return reply
      .disableCache()
      .view('album', {
        album: {
          id: id,
          title: title,
          files: files.map(file => ({
            path: `/f/${file.id}${extname(file.file)}`,
            ...file,
            type: mimetypeFilter(file.type)
          })),
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
    const { succeeded , code, data } = await fastify.db.getThumbnail(id)

    if (succeeded === false) return reply.error(code)

    const { thumbnail, uploadedBy } = data

    return reply
      .type('image/webp')
      .send(await fastify.storage.read(uploadedBy, thumbnail, {
        signal: request.signal
      }))
  })

  // Download album
  fastify.get('/a/:id/download', async (request, reply) => {
    const { id } = request.params
    const { succeeded , code, data } = await fastify.db.getAlbum(id)

    if (succeeded === false) return reply.error(code)

    const { title, uploadedBy, files, size } = data
    const archive = archiver('zip', {
      comment: `Album downloaded from ${reply.locals.title}`,
      store: true
    })

    for (const { id: fileID, file } of files) {
      archive.append(await fastify.storage.read(uploadedBy, file, {
        signal: request.signal
      }), {
        name: `${fileID}${extname(file)}`
      })
    }

    archive.finalize()

    return reply
      .type('application/zip')
      .header('Content-Length', size)
      .header('content-disposition', `attachment; filename=[${id}]${title}.zip`)
      .send(archive)
  })

  done()
}
