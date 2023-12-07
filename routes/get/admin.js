import { uptime } from 'node:process'
import { resolve } from 'node:path'
import { Log, html } from 'cmd430-utils'
import Tail from 'tail-file'


// eslint-disable-next-line no-unused-vars
const { log, debug, info, warn, error } = new Log('Admin (GET)')

export default function (fastify, opts, done) {

  fastify.get('/admin', async (request, reply) => {
    if (!request.session.get('authenticated') || request.session.get('session')?.isAdmin !== true) return reply.error(401)

    const { data } = await fastify.db.getInfo()
    const { totalAlbums, totalFiles, totalSize } = data

    return reply
      .disableCache()
      .view('admin', {
        stats: {
          totalFiles: totalFiles,
          totalAlbums: totalAlbums,
          totalSize: totalSize,
          uptime: uptime()
        }
      })
  })

  fastify.get('/admin/logs/:log', { websocket: true }, async (connection , request) => {
    if (!request.session.get('authenticated') || request.session.get('session')?.isAdmin !== true) return connection.socket.send('Not Authorized')

    const { log: logFile } = request.params
    const logPath = resolve(`logs/${logFile}.log`)
    const tail = new Tail(logPath, {
      startPos: 'end'
    })

    tail.on('error', err => error(err))
    tail.on('line', line => connection.socket.send(html(line)))
    tail.start()
  })

  done()
}

