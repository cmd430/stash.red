import createError from 'http-errors'
import { Log } from 'cmd430-utils'
import { deleteAzureBlobWithThumbnail } from '../../utils/azureBlobStorage.js'

// eslint-disable-next-line no-unused-vars
const { log, debug, info, warn, error } = new Log('Files (DELETE)')

export default function (fastify, opts, done) {

  fastify.delete('/f/:id', async (request, reply) => {
    const { id } = request.params
    const dbResult = fastify.betterSqlite3
      .prepare('SELECT file, uploadedBy FROM files WHERE id = ?')
      .get(id)

    if (!dbResult) return createError(400)

    const { file, uploadedBy } = dbResult

    if ((request.session.get('authenticated') ?? false) === false) return createError(401) // Not authd
    if (request.session.get('session').username !== uploadedBy) return createError(403) // Not allowed
    if (!await deleteAzureBlobWithThumbnail(uploadedBy, file)) return {
      message: 'file not deleted'
    }

    fastify.betterSqlite3
      .prepare('DELETE FROM files WHERE id = ?')
      .run(id)

    return {
      message: 'file deleted'
    }
  })

  done()
}

/* NOTE:

fetch('.', { method: 'DELETE' })

*/