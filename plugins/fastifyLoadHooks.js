import { fastifyPlugin } from 'fastify-plugin'
import { readdir } from 'node:fs/promises'

export default fastifyPlugin(async (fastify, opts, done) => {
  // Find and register hooks
  for (const file of await readdir('./hooks', { recursive: true })) {
    if (!file.endsWith('.js')) continue

    fastify.addHook(await import(`../hooks/${file}`))
  }

  done()
}, {
  fastify: '4.x',
  name: 'load-hooks'
})
