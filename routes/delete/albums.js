import createError from 'http-errors'
import { Log } from 'cmd430-utils'

// eslint-disable-next-line no-unused-vars
const { log, debug, info, warn, error } = new Log('Albums (DELETE)')

export default function (fastify, opts, done) {

  fastify.delete('/a/:id', async (request, reply) => {
    const { id } = request.params
    const dbResultAlbum = fastify.betterSqlite3
      .prepare('SELECT "uploadedBy" FROM "albums" WHERE "id" = ?')
      .get(id)

    if (!dbResultAlbum) return createError(404)

    const { uploadedBy } = dbResultAlbum
    const dbResultFiles = fastify.betterSqlite3
      .prepare('SELECT "id", "file" FROM "files" WHERE "inAlbum" = ? AND "uploadedBy" = ?')
      .all(id, uploadedBy)

    if (!dbResultFiles) return createError(404)
    if ((request.session.get('authenticated') ?? false) === false) return createError(401) // Not authd
    if (request.session.get('session')?.username !== uploadedBy) return createError(403) // Not allowed

    const album = []

    for (const { id: fileID, file } of dbResultFiles) album.push({ fileID, file })

    debug(album)

    for (const { fileID, file } of album) {
      const removedBlob = await fastify.storage.delete(uploadedBy, file)

      if (!removedBlob) delete album[album.findIndex(obj => obj?.fileID === fileID)]
    }

    const statement = fastify.betterSqlite3.prepare('DELETE FROM "files" WHERE "id" = ?')
    const transaction = fastify.betterSqlite3.transaction(albumFiles => albumFiles.map(({ fileID }) => statement.run(fileID)))
    const removed = transaction(album.filter(e => e))
      .reduce((accumulator, currentValue) => (accumulator += currentValue.changes), 0)

    if (removed > 0) {
      if (dbResultFiles.length !== removed) {
        debug('Removed', removed, 'files from album', id)
      } else {
        debug('Removed album', id, 'with', removed, 'files')
      }
    }

    if (removed === 0) return reply
      .status(500)
      .send({
        message: 'album not deleted'
      })

    if (dbResultFiles.length !== removed) return reply
      .status(200)
      .send({
        message: 'album partially deleted'
      })

    return reply
      .status(204)
      .send()
  })

  done()
}
