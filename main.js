#!/usr/bin/env node

require('json5/lib/register')
const config = {
  stash: require('./configs/stash.json5'),
  express: require('./configs/express.json5')
}

switch (config.stash.server.env) {
  case 'dev':
  case 'development':
    process.env['NODE_ENV'] = 'development'
    break
  case 'prod':
  case 'production':
  default:
    process.env['NODE_ENV'] = 'production'
}

const http = require('http')
const app = require('./app.js')
const { log, info, debug, warn, error } = require('./logger.js')

/**
 * Create HTTP server.
 */
let server = http.createServer(app)
server.listen(config.express.port)
server.on('error', onError)
server.on('listening', onListening)

function onError(err) {
  if (err.syscall !== 'listen') {
    throw err
  }
  switch (err.code) {
    case 'EACCES':
      error(`Port '${config.express.port}' requires elevated privileges`)
      process.exit(1)
      break
    case 'EADDRINUSE':
      error(`Port '${config.express.port}' is already in use`)
      process.exit(1)
      break
    default:
      throw err
  }
}

function onListening() {
  log({
    msg: 'Server is'
  },
  {
    msg: 'Listening on port',
    color: 'limegreen'
  },
  {
    msg: server.address().port,
    color: 'yellow'
  })
}
