import { readdir } from 'node:fs/promises'
import { dirname } from 'node:path'
import { fastifyPlugin } from 'fastify-plugin'
import { Log } from 'cmd430-utils'

// eslint-disable-next-line no-unused-vars
const { log, debug, info, warn, error } = new Log('Hooks')

export default fastifyPlugin(async (fastify, opts) => {
  // Find and register hooks
  for (const file of await readdir('./hooks', { recursive: true })) {
    if (!file.endsWith('.js')) continue

    const { default: handler } = await import(`../hooks/${file}`)

    fastify.addHook(dirname(file), handler)
  }
}, {
  fastify: '4.x',
  name: 'load-hooks'
})
