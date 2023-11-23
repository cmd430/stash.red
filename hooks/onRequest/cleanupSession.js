import { Log } from 'cmd430-utils'

// eslint-disable-next-line no-unused-vars
const { log, debug, info, warn, error } = new Log('Session Debug')

export default function handler (request, reply, done) {
  if (request.url === '/2fa' || request.url === '/verify') return done()
  if (request.session.get('authenticated')) return done()
  if (request.session.get('session') === undefined) return done()

  // Remove half logged in sessions (user didnt submit 2fa token)
  request.session.destroy()

  return reply.redirect(request.url)
}
