import { Log } from 'cmd430-utils'
import { evaluate } from 'mathjs'
import { fastifyPlugin } from 'fastify-plugin'

// eslint-disable-next-line no-unused-vars
const { log, debug, info, warn, error } = new Log('Temporary Uploads')

async function performGC (fastify) {
  const expired = []
  const temporal = fastify.betterSqlite3
    .prepare('SELECT "id", "file", "uploadedAt", "uploadedBy", "ttl" FROM "files" WHERE "ttl" NOT NULL')
    .all()

  for (const { id, file, uploadedAt, uploadedBy, ttl } of temporal) {
    if (Date.now() - new Date(new Date(uploadedAt).getTime() + (1000 * ttl)) >= 0) {
      expired.push({ id, uploadedBy, file })
    }
  }

  for (const { id, file, uploadedBy } of expired) {
    const removedBlob = await fastify.storage.delete(uploadedBy, file)

    if (!removedBlob) delete expired[expired.findIndex(obj => obj?.id === id)]
  }

  const statement = fastify.betterSqlite3
    .prepare('DELETE FROM "files" WHERE "id" = ?')
  const transaction = fastify.betterSqlite3
    .transaction(expiredFiles => expiredFiles.map(({ id }) => statement.run(id)))
  const removed = transaction(expired.filter(e => e))
    .reduce((accumulator, currentValue) => (accumulator += currentValue.changes), 0)

  if (removed > 0) debug('Removed', removed, 'temporary uploads')
}

export default fastifyPlugin((fastify, opts, done) => {
  const { uploads: { temporary: { gcInterval } } } = fastify.config

  performGC(fastify)
  setInterval(() => performGC(fastify), evaluate(gcInterval))
  done()
}, {
  fastify: '4.x',
  name: 'temporary-uploads-garbarge-collection'
})
