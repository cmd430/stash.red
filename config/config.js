import { readFile, readdir } from 'node:fs/promises'
import { resolve, extname } from 'node:path'
import Database from 'better-sqlite3'

const db = new Database('./config/config.db', {
  readonly: false,
  fileMustExist: false,
  timeout: 5000,
  verbose: null
})

for (const script of await readdir(resolve('./config/sql'))) {
  if (extname(script) !== '.sql') continue

  db.exec(await readFile(resolve(`./config/sql/${script}`), {
    encoding: 'utf8'
  }))
}

export const config = db.prepare('SELECT "key", "value" FROM "config"')
  .all()
  .reduce((obj, { key, value }) => {
    try {
      obj[key] = JSON.parse(value)
    } catch (e) {
      obj[key] = value
    }
    return obj
  }, {})
export default config

// Gracefully close the DB on exit
process.on('exit', () => db.close())
process.on('SIGHUP', () => process.exit(128 + 1))
process.on('SIGINT', () => process.exit(128 + 2))
process.on('SIGTERM', () => process.exit(128 + 15))
