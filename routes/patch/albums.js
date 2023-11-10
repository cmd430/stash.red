import createError from 'http-errors'
import { Log } from 'cmd430-utils'

// eslint-disable-next-line no-unused-vars
const { log, debug, info, warn, error } = new Log('Albums (PATCH)')

export default function (fastify, opts, done) {

  fastify.patch('/a/:id', async (request, reply) => {
    const { id } = request.params

    const dbResult = fastify.betterSqlite3
      .prepare('SELECT "uploadedBy" FROM "album" WHERE "id" = ?')
      .get(id)

    if (!dbResult) return createError(400)

    const { uploadedBy } = dbResult

    if ((request.session.get('authenticated') ?? false) === false) return createError(401) // Not authd
    if (request.session.get('session').username !== uploadedBy) return createError(403) // Not allowed

    // Edits
    if (request.body.title && request.body.order) { // Only support one type of edit per request
      return reply
        .status(400)
        .send()
    }

    if (request.body.title) { // Update Album Title
      const { title } = request.body
      const newTitle = title !== null && title.trim() === '' ? 'Untitled Album' : title.trim()
      const { changes } = fastify.betterSqlite3
        .prepare('UPDATE "albums" SET "title" = ? WHERE "id" = ? AND "title" <> ?')
        .run(newTitle, id, newTitle)

      if (changes > 0) debug('Updated title of album', id)

      return reply
        .status(204)
        .send()
    }

    if (request.body.order) { // Update Album Order
      debug(request.body.order)

      const order = JSON.parse(request.body.order)
      const files = []

      for (const [ fileID, fileOrder ] of Object.entries(order)) files.push({
        fileID: fileID,
        fileOrder: fileOrder,
        albumID: id
      })

      const statement = fastify.betterSqlite3
        .prepare('UPDATE "files" SET "albumOrder" = ? WHERE "id" = ? AND "inAlbum" = ? AND "albumOrder" <> ?')
      const transaction = fastify.betterSqlite3
        .transaction(albumFiles => albumFiles.map(({ fileID, fileOrder, albumID }) => statement.run(fileOrder, fileID, albumID, fileOrder)))
      const updated = transaction(files)
        .reduce((accumulator, currentValue) => (accumulator += currentValue.changes), 0)

      if (updated > 0) debug('Updated order of', updated, 'files in album', id)

      return reply
        .status(204)
        .send()
    }

    // ?? no valid edit payload
    return reply
      .status(400)
      .send()
  })

  done()
}
