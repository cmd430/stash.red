import createError from 'http-errors'
import { Log } from 'cmd430-utils'

// eslint-disable-next-line no-unused-vars
const { log, debug, info, warn, error } = new Log('Files (DELETE)')

export default function (fastify, opts, done) {

  fastify.delete('/f/:id', async (request, reply) => {
    if ((request.session.get('authenticated') ?? false) === false) return createError(401) // Not authd

    const { id } = request.params
    const { username } = request.session.get('session') ?? null
    const { succeeded, code, data } = await fastify.db.deleteFile(id, username)

    if (succeeded === false) return createError(code)

    await fastify.storage.delete(username, data.file)

    return reply
      .status(204)
      .send()
  })

  done()
}
