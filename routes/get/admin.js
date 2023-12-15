import { uptime } from 'node:process'
import { resolve } from 'node:path'
import { Log, html } from 'cmd430-utils'
import Tail from 'tail-file'
import { commitID, commitShortID } from '../../utils/git.js'


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
        },
        info: {
          commit: commitID,
          shortCommit: commitShortID
        }
      })
  })

  fastify.get('/admin/logs/:log', { websocket: true }, async (connection , request) => {
    const { socket } = connection

    if (!request.session.get('authenticated') || request.session.get('session')?.isAdmin !== true) return socket.send('Not Authorized')

    const { log: logFile } = request.params
    const logPath = resolve(`logs/${logFile}.log`)
    const tail = new Tail(logPath, {
      startPos: 'end'
    })

    tail.on('error', err => {
      socket.send(err.toString())
      error(err)
    })
    tail.on('line', line => socket.send(JSON.stringify({
      type: 'message',
      message: html(line)
    })))
    tail.start()

    socket.on('message', message => {
      const { type } = JSON.parse(message)

      if (type === 'PING') return socket.send(JSON.stringify({
        type: 'PONG'
      }))

      socket.send(JSON.stringify({
        type: 'error',
        message: 'invalid message'
      }))
    })
    socket.once('close', () => tail.stop())
  })

  done()
}

