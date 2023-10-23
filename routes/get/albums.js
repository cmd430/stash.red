import { Log } from 'cmd430-utils'

// eslint-disable-next-line no-unused-vars
const { log, debug, info, warn, error } = new Log('Albums (GET)')

// TODO: Add 404 etc error handling
// TODO: Respect isPrivate Flags
// TODO: Album pages

export default function (fastify, opts, done) {

  // Get album by ID
  fastify.get('/a/:id', async (req, reply) => {
    const { id } = req.params

    const { title, files, order, isPrivate } = fastify.betterSqlite3
      .prepare('SELECT title, files, order, isPrivate FROM albums WHERE id = ?')
      .get(id)

    return {
      message: 'WIP',
      album: id,
      data: {
        title, files, order, isPrivate
      }
    }
  })

  // Get album thumbnail
  fastify.get('/a/:id/thumbnail', async (req, reply) => {
    const { id } = req.params

    // TODO: Get thumbnail of first file in album

    return {
      message: 'WIP',
      album: id
    }
  })

  // Get info for album
  fastify.get('/a/:id/info', async (req, reply) => {
    const { id } = req.params

    return fastify.betterSqlite3
      .prepare('SELECT * FROM albums WHERE id = ?')
      .get(id)
  })

  done()
}
