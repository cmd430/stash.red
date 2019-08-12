require('json5/lib/register')
const mkdirp = require('mkdirp')
const { join } = require('path')
const database = require('better-sqlite3-helper')
require = require('esm')(module)

const __argv = require('minimist')(process.argv.slice(2))
let argv = {}
if (__argv.logLevel) {
  if (!argv.log) argv.log = {}
  switch (__argv.logLevel) {
    case 'silent':
      argv.log.level = 0
      break
    case 'info':
      argv.log.level = 1
      break
    case 'warn':
      argv.log.level = 2
      break
    case 'debug':
      argv.log.level = 3
      break
    case 'error':
      argv.log.level = 4
      break
    default:
      argv.log.level = 1
  }
}
if (__argv.env) {
  if (!argv.server) argv.server = {}
  __argv.env.includes('dev')
    ? argv.server.env = 'development'
    : argv.server.env = 'production'
}
if (__argv.port) {
  if (!argv.server) argv.server = {}
  if (!argv.server.ports) argv.server.ports = {}
  argv.server.ports.http = __argv.port || 80
}
if (__argv.secure_port) {
  if (!argv.server) argv.server = {}
  if (!argv.server.ports) argv.server.ports = {}
  argv.server.ports.https = __argv.secure_port || 443
}
if (__argv.https) {
  if (!argv.server) argv.server = {}
  argv.server.https = __argv.https || false
}

global.config = require('./utils/helpers').merge(
  require('./configs/stash'),
  require('./configs/express'),
  require('./configs/sqlite3'),
  argv
)

config.server.env.includes('dev')
  ? process.env['NODE_ENV'] = 'development'
  : process.env['NODE_ENV'] = 'production'

process.env['FORCE_COLOR'] = config.log.color.enabled
  ? config.log.color.level
  : 0

process.noDeprecation = config.log.level <= 2
  ? true
  : false

mkdirp.sync(join(__dirname, 'storage', 'temp'))
mkdirp.sync(join(__dirname, 'storage', 'database'))
mkdirp.sync(join(__dirname, 'storage', 'image'))
mkdirp.sync(join(__dirname, 'storage', 'audio'))
mkdirp.sync(join(__dirname, 'storage', 'video'))
mkdirp.sync(join(__dirname, 'storage', 'thumbnail'))

database({
  path: join(__dirname, 'storage', 'database', 'stash.db'),
  memory: false,
  readonly: false,
  fileMustExist: false,
  WAL: true,
  migrate: {
    force: false,
    table: 'migration',
    migrationsPath: join(__dirname, 'storage', 'database', 'migrations')
  }
})

module.exports = require('./server')
