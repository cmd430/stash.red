import { Log } from 'cmd430-utils'
import { evaluate } from 'mathjs'
import { fastifyPlugin } from 'fastify-plugin'
import { deleteAzureBlobWithThumbnail } from '../utils/azureBlobStorage.js'

// eslint-disable-next-line no-unused-vars
const { log, debug, info, warn, error } = new Log('Temporary Uploads')

async function performGC (db) {
  const expired = []
  const temporal = db
    .prepare('SELECT id, file, uploaded_at, uploaded_by, ttl FROM files WHERE ttl NOT NULL')
    .all()

  for (const { id, file, uploaded_at, uploaded_by, ttl } of temporal) {
    if (Date.now() - new Date(new Date(uploaded_at).getTime() + (1000 * ttl)) >= 0) {
      expired.push({ id, uploaded_by, file })
    }
  }

  for (const { id, file, uploaded_by } of expired) {
    const removedBlob = await deleteAzureBlobWithThumbnail(uploaded_by, file)

    if (!removedBlob) delete expired[expired.findIndex(obj => obj.id === id)]
  }

  const statement = db.prepare('DELETE FROM files WHERE id = ?')
  const transaction = db.transaction(expiredFiles => expiredFiles.map(({ id }) => statement.run(id)))
  const removed = transaction(expired.filter(e => e))
    .reduce((accumulator, currentValue) => (accumulator += currentValue.changes), 0)

  if (removed > 0) debug('Removed', removed, 'temporary uploads')
}

export default fastifyPlugin((fastify, opts, done) => {
  const { uploads: { temporary: { gcInterval } } } = fastify.config

  performGC(fastify.betterSqlite3)
  setInterval(() => performGC(fastify.betterSqlite3), evaluate(gcInterval))
  done()
}, {
  fastify: '4.x',
  name: 'temporary-uploads-garbarge-collection'
})
