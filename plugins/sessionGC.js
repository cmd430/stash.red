import { Log } from 'cmd430-utils'
import { evaluate } from 'mathjs'
import { fastifyPlugin } from 'fastify-plugin'

// eslint-disable-next-line no-unused-vars
const { log, debug, info, warn, error } = new Log('Session GC')

async function performGC (db) {
  const { changes: removed } = db
    .prepare('DELETE FROM session WHERE expires < strftime(\'%Y-%m-%dT%H:%M:%fZ\', \'now\')')
    .run()

  if (removed > 0) debug('Removed', removed, 'expired sessions')
}

export default fastifyPlugin((fastify, opts, done) => {
  const { session: { gcInterval } } = fastify.config

  performGC(fastify.betterSqlite3)
  setInterval(() => performGC(fastify.betterSqlite3), evaluate(gcInterval))
  done()
}, {
  fastify: '4.x',
  name: 'session-garbarge-collection'
})
