import { createServer } from 'http'
import { info, debug, error } from './utils/logger'
import app from './app'

/**
 * Create HTTP server.
 */
let server = createServer(app)
server.listen(config.server.port)
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
  info('Server is',
  [
    'Listening on port',
    { color: 'limegreen' }
  ],
  [
    server.address().port,
    { color: 'yellow' }
  ])
}
