import { readFile, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import Database from 'better-sqlite3'

const db = new Database('./database/stash.db', {
  readonly: false,
  fileMustExist: false,
  timeout: 5000,
  verbose: null
})

db.pragma('journal_mode = WAL')

const tables = await readdir(resolve('./database/tables'))

for await (const table of tables) db.exec(await readFile(resolve(`./database/tables/${table}`), {
  encoding: 'utf8'
}))

export default db
