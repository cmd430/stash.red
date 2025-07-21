import { Log } from 'cmd430-utils'
import { evaluate } from 'mathjs'
import { fastifyPlugin } from 'fastify-plugin'

// eslint-disable-next-line no-unused-vars
const { log, debug, info, warn, error } = new Log('Temporary Uploads')

async function performGC (fastify) {
  const { data } = await fastify.db.cleanExpired()
  const { expired } = data

  for (const { file, uploadedBy } of expired) await fastify.storage.delete(uploadedBy, file)
}

export default fastifyPlugin(async (fastify, opts) => {
  const { uploads: { temporary: { gcInterval } } } = fastify.config

  performGC(fastify)
  setInterval(() => performGC(fastify), evaluate(gcInterval))
}, {
  fastify: '5.x',
  name: 'temporary-uploads-garbarge-collection'
})
