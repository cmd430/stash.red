import { Log } from 'cmd430-utils'

// eslint-disable-next-line no-unused-vars
const { log, debug, info, warn, error } = new Log('Database')

/**
 * Base class for DatabaseInterface
 * @interface
 */
export class DatabaseInterfaceBase {

  /**
   * Constructor for DatabaseInterface with optional options
   */
  constructor (opts) {
    debug('Hello')
  }

  // TODO: create generic methods for getting and setting the data in database
}

/**
 * @typedef { "sqlite" } interfaceTypes
 */

/**
 * @param {interfaceTypes} interfaceType
 * @returns {DatabaseInterface}
 */
export async function getDatabaseInterface (interfaceType) {
  const { default: databaseInterface } = await import(`./database/${interfaceType}Database.js`)

  return databaseInterface
}
