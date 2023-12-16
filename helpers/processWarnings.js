import process from 'node:process'
import { Log } from 'cmd430-utils'

// eslint-disable-next-line no-unused-vars
const { log, debug, info, warn, error } = new Log('NodeJS')

process.removeAllListeners('warning')
process.on('warning', warning => warn(warning.stack))
