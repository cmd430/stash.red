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
const indices = await readdir(resolve('./database/indices'))
const triggers = await readdir(resolve('./database/triggers'))
const views = await readdir(resolve('./database/views'))

for (const table of tables) db.exec(await readFile(resolve(`./database/tables/${table}`), {
  encoding: 'utf8'
}))
for (const index of indices) db.exec(await readFile(resolve(`./database/indices/${index}`), {
  encoding: 'utf8'
}))
for (const trigger of triggers) db.exec(await readFile(resolve(`./database/triggers/${trigger}`), {
  encoding: 'utf8'
}))
for (const view of views) db.exec(await readFile(resolve(`./database/views/${view}`), {
  encoding: 'utf8'
}))

export default db
