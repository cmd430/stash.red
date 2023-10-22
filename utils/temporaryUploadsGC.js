import { Log } from 'cmd430-utils'

// eslint-disable-next-line no-unused-vars
const { log, debug, info, warn, error } = new Log('Temporary Uploads')
const gcInterval = 1000 * 60 * 5 // 5mins


// TODO: make this delete from Azure
function performGC (db) {
  const expiredIDs = []
  const temporal = db
    .prepare('SELECT _id, uploaded_at, ttl FROM files WHERE ttl NOT NULL')
    .all()

  for (const { _id, uploaded_at, ttl } of temporal) {
    if (Date.now() - new Date(new Date(uploaded_at).getTime() + (1000 * ttl)) >= 0) {
      expiredIDs.push(_id)
    }
  }

  const statement = db.prepare('DELETE FROM files WHERE _id = ?')
  const transaction = db.transaction(id => {
    return id.map(x => statement.run(x))
  })
  const removed = transaction(expiredIDs)
    .reduce((accumulator, currentValue) => (accumulator += currentValue.changes), 0)

  if (removed > 0) debug('Removed', removed, 'temporary uploads')
}

export default function temporaryUploadsGC (dbConnection) {
  performGC(dbConnection)
  setInterval(() => performGC(dbConnection), gcInterval)
}
