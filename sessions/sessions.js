import { Log } from 'cmd430-utils'
import { evaluate } from 'mathjs'
import Database from 'better-sqlite3'
import { config } from '../config/config.js'

// eslint-disable-next-line no-unused-vars
const { log, debug, info, warn, error } = new Log('Session')
const { session: { gcInterval } } = config

const db = new Database('./sessions/sessions.db', {
  readonly: false,
  fileMustExist: false,
  timeout: 5000,
  verbose: null
})

db.pragma('journal_mode = WAL')

export const sessions = db
export default db

// Clean up expired sessions
async function performGC () {
  const { changes: removed } = db
    .prepare('DELETE FROM "session" WHERE "expires" < strftime(\'%Y-%m-%dT%H:%M:%fZ\', \'now\')')
    .run()

  if (removed > 0) debug('Removed', removed, 'expired sessions')
}
setInterval(() => performGC(), evaluate(gcInterval))
performGC()

// Gracefully close the DB on exit
process.on('exit', () => sessions.close())
process.on('SIGHUP', () => process.exit(128 + 1))
process.on('SIGINT', () => process.exit(128 + 2))
process.on('SIGTERM', () => process.exit(128 + 15))
