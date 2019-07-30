require('json5/lib/register')

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
  argv.server.port = __argv.port || 80
}

global.config = require('./utils/helpers').merge(
  require('./configs/stash'),
  require('./configs/express'),
  require('./configs/mongoose'),
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

require = require('esm')(module)
module.exports = require('./server')
