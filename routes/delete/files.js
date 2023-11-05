import createError from 'http-errors'
import { Log } from 'cmd430-utils'
import { deleteAzureBlobWithThumbnail } from '../../utils/azureBlobStorage.js'

// eslint-disable-next-line no-unused-vars
const { log, debug, info, warn, error } = new Log('Files (DELETE)')

export default function (fastify, opts, done) {

  fastify.get('/f/:id/delete', async (request, reply) => {
    const { id } = request.params
    const { file, uploaded_by } = fastify.betterSqlite3
      .prepare('SELECT file, uploaded_by FROM files WHERE id = ?')
      .get(id)

    if ((request.session.get('authenticated') ?? false) === false) return createError(401) // Not authd
    if (request.session.get('session').username !== uploaded_by) return createError(403) // Not allowed
    if (!await deleteAzureBlobWithThumbnail(uploaded_by, file)) return {
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
