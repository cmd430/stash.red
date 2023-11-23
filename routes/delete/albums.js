import { Log } from 'cmd430-utils'

// eslint-disable-next-line no-unused-vars
const { log, debug, info, warn, error } = new Log('Albums (DELETE)')

export default function (fastify, opts, done) {

  fastify.delete('/a/:id', async (request, reply) => {
    if ((request.session.get('authenticated') ?? false) === false) return reply.error(401)

    const { id } = request.params
    const { username } = request.session.get('session') ?? null
    const { succeeded, code, data } = await fastify.db.deleteAlbum(id, username)

    if (succeeded === false) return reply.error(code)

    for (const file of data.files) await fastify.storage.delete(username, file)

    return reply
      .status(204)
      .send()
  })

  done()
}
