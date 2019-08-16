require('json5/lib/register')
const mkdirp = require('mkdirp')
const { readdir, unlink } = require('fs')
const { join, extname } = require('path')
const database = require('better-sqlite3-helper')
require = require('esm')(module)
const { error, debug } = require('./utils/logger')

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

readdir(join(__dirname, 'storage', 'temp'), (err, files) => {
  if (!err) {
    if (files.length > 0) {
      for (let index = 0; index < files.length; index++) {
        unlink(join(__dirname, 'storage', 'temp', files[index]), err => {})
      }
    }
  }
})

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

setInterval(() => {
  try {
    database().query('SELECT file_id, mimetype, original_filename FROM files WHERE uploaded_until < strftime("%Y-%m-%dT%H:%M:%fZ", "now") AND in_album IS NULL').forEach(file => {
      try {
        unlink(join(__dirname, 'storage', 'thumbnail', `${file.file_id}.webp`), err => {
          if (err) {
            error(err.message)
            if (err.code !== 'ENOENT') throw err
          }
        })
        unlink(join(__dirname, 'storage', file.mimetype.split('/').reverse().pop(), `${file.file_id}${extname(file.original_filename)}`), err => {
          if (err) {
            error(err.message)
            if (err.code !== 'ENOENT') throw err
          }
        })

        database().run('DELETE FROM files WHERE file_id=?', file.file_id)

        debug('Removed temp file (', [file.file_id, {color: 'cyan'}], ')')
      } catch (err) {
        error(err.message)
      }
    })
  } catch (err) {
    error(err.message)
  }
  try {
    database().query('SELECT album_id FROM albums WHERE uploaded_until < strftime("%Y-%m-%dT%H:%M:%fZ", "now")').forEach(album => {
      try {
        database().query('SELECT file_id, mimetype, original_filename FROM files WHERE in_album=?', album.album_id).forEach(file => {
          unlink(join(__dirname, 'storage', 'thumbnail', `${file.file_id}.webp`), err => {
            if (err) {
              error(err.message)
              if (err.code !== 'ENOENT') throw err
            }
          })
          unlink(join(__dirname, 'storage', file.mimetype.split('/').reverse().pop(), `${file.file_id}${extname(file.original_filename)}`), err => {
            if (err) {
              error(err.message)
              if (err.code !== 'ENOENT') throw err
            }
          })
        })

        database().run('DELETE FROM albums WHERE album_id=?', album.album_id)

        debug('Removed temp album (', [album.album_id, {color: 'cyan'}], ')')
      } catch (err) {
        error(err.message)
      }
    })
  } catch (err) {
    error(err.message)
  }
}, 60000)

module.exports = require('./server')
