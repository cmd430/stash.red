import { Log } from 'cmd430-utils'
import { deleteAzureBlob } from '../utils/azureBlob.js'

// eslint-disable-next-line no-unused-vars
const { log, debug, info, warn, error } = new Log('Temporary Uploads')
const gcInterval = 1000 * 60 * 5 // 5mins

async function performGC (db) {
  const expired = []
  const temporal = db
    .prepare('SELECT _id, file, uploaded_at, uploaded_by, ttl FROM files WHERE ttl NOT NULL')
    .all()

  for (const { _id: id, file, uploaded_at, uploaded_by, ttl } of temporal) {
    if (Date.now() - new Date(new Date(uploaded_at).getTime() + (1000 * ttl)) >= 0) {
      expired.push({ id, uploaded_by, file })
    }
  }

  for (const { id, file, uploaded_by } of expired) {
    const removedBlob = await deleteAzureBlob(uploaded_by, file)

    if (!removedBlob) delete expired[expired.findIndex(obj => obj.id === id)]
  }

  const statement = db.prepare('DELETE FROM files WHERE _id = ?')
  const transaction = db.transaction(expiredFiles => expiredFiles.map(({ id }) => statement.run(id)))
  const removed = transaction(expired.filter(e => e))
    .reduce((accumulator, currentValue) => (accumulator += currentValue.changes), 0)

  if (removed > 0) debug('Removed', removed, 'temporary uploads','\n\t')
}

export default function (fastify, opts, done) {
  performGC(fastify.betterSqlite3)

  setInterval(() => performGC(fastify.betterSqlite3), gcInterval)

  done()
}
