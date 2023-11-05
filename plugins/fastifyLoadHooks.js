import { readdir } from 'node:fs/promises'
import { dirname } from 'node:path'
import { fastifyPlugin } from 'fastify-plugin'

export default fastifyPlugin(async (fastify, opts, done) => {
  // Find and register hooks
  for (const file of await readdir('./hooks', { recursive: true })) {
    if (!file.endsWith('.js')) continue

    const { default: handler } = await import(`../hooks/${file}`)

    fastify.addHook(dirname(file), handler)
  }

  done()
}, {
  fastify: '4.x',
  name: 'load-hooks'
})
