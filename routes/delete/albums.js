import createError from 'http-errors'
import { Log } from 'cmd430-utils'

// eslint-disable-next-line no-unused-vars
const { log, debug, info, warn, error } = new Log('Albums (DELETE)')

export default function (fastify, opts, done) {

  fastify.delete('/a/:id', async (request, reply) => {
    const { id } = request.params

    if ((request.session.get('authenticated') ?? false) === false) return createError(401) // Not authd

    const { username } = request.session.get('session') ?? null
    const { succeeded, code, data } = await fastify.db.deleteAlbum(id, username)

    if (succeeded === false) return createError(code)

    for (const file of data.files) await fastify.storage.delete(username, file)

    return reply
      .status(204)
      .send()
  })

  done()
}
