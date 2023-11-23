import { Log } from 'cmd430-utils'

// eslint-disable-next-line no-unused-vars
const { log, debug, info, warn, error } = new Log('Albums (PATCH)')

export default function (fastify, opts, done) {

  fastify.patch('/a/:id', async (request, reply) => {
    if ((request.session.get('authenticated') ?? false) === false) return reply.error(401) // Not authd
    if ((request.body.title && request.body.order) || (!request.body.title && !request.body.order)) {
      // Only support one type of edit per request, and also we only support title and order
      return reply
        .status(400)
        .send()
    }

    const { id } = request.params
    const { username } = request.session.get('session') ?? null
    const { succeeded, code } = await fastify.db.editAlbum(id, username, request.body)

    if (succeeded === false) return reply.error(code)

    return reply
      .status(204)
      .send()
  })

  done()
}
