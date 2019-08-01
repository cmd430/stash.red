import { readFileSync } from 'fs'
import { join } from 'path'

import http, { createServer } from 'http'
import https, { createServer as createSecureServer } from 'https'
import { info, debug, error } from './utils/logger'
import app from './app'

/**
 * Create HTTP server.
 */
createServer(app)
.on('error', onError)
.on('listening', onListening)
.listen(config.server.ports.http)

if (config.server.https) {
  try {
    createSecureServer({
      key: readFileSync(join(__dirname, 'configs', 'keys', 'server.key')),
      cert: readFileSync(join(__dirname, 'configs', 'keys', 'server.cert'))
    }, app)
    .on('error', onError)
    .on('listening', onListening)
    .listen(config.server.ports.https)
  } catch (err) {
    // should only fail if missing a valid key
    error(`Missing valid SSL cert/key fallingback to http only (${err.message})`)
    config.server.https = false
  }
}

function onError(err) {
  this instanceof http.Server
    ? debug('HTTP server error')
    : this instanceof https.Server
      ? debug('HTTPS server error')
      : debug('Unknown server error')
  if (err.syscall !== 'listen') throw err
  if (err.code === 'EADDRINUSE') {
    error(`Port '${config.server.ports[this instanceof http.Server ? 'http' : 'https']}' is already in use`)
    process.exit(1)
  }
  throw err
}

function onListening() {
  info(
    this instanceof http.Server
      ? 'Server'
      : 'Secure Server',
    ['Listening at address', {color: 'limegreen'}],
    [this.address().address, {color: 'yellow'}],
    ['on port', {color: 'limegreen'}],
    [this.address().port, {color: 'yellow'}],
    ['using', {color: 'limegreen'}],
    [this.address().family, {color: 'yellow'}])
}
