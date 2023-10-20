const gcInterval = 1000 * 60 * 5 // 5mins

function performGC (db) {
  const removedIDs = []
  const temporal = db.prepare('SELECT id, uploaded_at, ttl FROM test WHERE ttl NOT NULL')
  .all()

  for (const { id, uploaded_at, ttl } of temporal) {
    if (Date.now() - new Date(new Date(uploaded_at).getTime() + (1000 * ttl)) >= 0) {
      db.prepare('DELETE FROM test WHERE id = ?')
      .run(id)
      removedIDs.push(id)
    }
  }

  console.debug('Removed', removedIDs.length, 'temporary uploads')
}

export default function temporaryUploadsGC (dbConnection) {
  performGC(dbConnection)
  setInterval(() => performGC(dbConnection), gcInterval)
}
