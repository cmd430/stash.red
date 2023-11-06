import createError from 'http-errors'
import { Log } from 'cmd430-utils'

// eslint-disable-next-line no-unused-vars
const { log, debug, info, warn, error } = new Log('Albums (PATCH)')

export default function (fastify, opts, done) {

  // TODO: support album file reordering

  fastify.patch('/a/:id', async (request, reply) => {
    const { id } = request.params
    const { title: newTitle } = request.body
    const dbResult = fastify.betterSqlite3
      .prepare('SELECT title, uploadedBy FROM album WHERE id = ?')
      .get(id)

    if (!dbResult) return createError(400)

    const { title, uploadedBy } = dbResult

    if ((request.session.get('authenticated') ?? false) === false) return createError(401) // Not authd
    if (request.session.get('session').username !== uploadedBy) return createError(403) // Not allowed

    if (newTitle && newTitle !== title) fastify.betterSqlite3
      .prepare('UPDATE albums SET title = ? WHERE id = ?')
      .run(newTitle, id)

    return reply
      .status(204)
      .send()
  })

  done()
}
