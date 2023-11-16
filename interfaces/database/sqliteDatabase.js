import { Log } from 'cmd430-utils'
import { DatabaseInterfaceBase } from '../database.js'

// eslint-disable-next-line no-unused-vars
const { log, debug, info, warn, error } = new Log('Database (Sqlite3)')

export default class DatabaseInterface extends DatabaseInterfaceBase {

}
