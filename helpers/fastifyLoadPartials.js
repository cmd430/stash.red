import { readdir } from 'node:fs/promises'
import { Log } from 'cmd430-utils'

// eslint-disable-next-line no-unused-vars
const { log, debug, info, warn, error } = new Log('Load Partials')

export default async function fastifyLoadPartials () {
  const partials = {}

  // Find partials
  for (const partial of await readdir('./views/partials')) {
    if (!partial.endsWith('.hbs')) continue

    partials[partial.slice(0, -4)] = `partials/${partial}`
  }

  // Return found partials
  return partials
}
