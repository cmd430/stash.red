import { Log } from 'cmd430-utils'

// eslint-disable-next-line no-unused-vars
const { log, debug, info, warn, error } = new Log('Session Debug')

export default function handler (request, reply, done) {
  debug({
    authenticated: (request.session.get('authenticated') ?? false),
    ...request.session.get('session')
  })
  done()
}
