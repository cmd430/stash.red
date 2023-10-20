import { Log } from 'cmd430-utils'

// eslint-disable-next-line no-unused-vars
const { log, debug, info, warn, error } = new Log('Temporary Uploads')
const gcInterval = 1000 * 60 * 5 // 5mins

function performGC (db) {
  const removedIDs = []
  const temporal = db.prepare('SELECT _id, uploaded_at, ttl FROM test WHERE ttl NOT NULL')
  .all()

  for (const { _id, uploaded_at, ttl } of temporal) {
    if (Date.now() - new Date(new Date(uploaded_at).getTime() + (1000 * ttl)) >= 0) {
      db.prepare('DELETE FROM test WHERE id = ?')
      .run(_id)
      removedIDs.push(_id)
    }
  }

  if (removedIDs.length > 0) debug('Removed', removedIDs.length, 'temporary uploads')
}

export default function temporaryUploadsGC (dbConnection) {
  performGC(dbConnection)
  setInterval(() => performGC(dbConnection), gcInterval)
}
