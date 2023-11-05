import { isDevEnv } from 'cmd430-utils'
import { config } from '../config/config.js'

const { siteTheme } = config.render

export default function fastifiyDefaultLocals () {
  return Object.values({
    hook: 'preHandler',
    handler (request, reply, done) {
      const base = request.url.split('?')[0]

      reply.locals = {
        base: `${base}${base.endsWith('/') ? '' : '/'}`,
        title: 'stash.red',
        openGraph: {
          site: request.hostname,
          title: null,
          description: null,
          theme: isDevEnv() ? siteTheme.dev : siteTheme.prod,
          url: `${request.protocol}://${request.hostname}${request.url}`,
          mimetype: null,
          // the direct path of the thing
          path: null,
          // The feilds set by the type of thing are viewing
          isImage: null,
          isVideo: null,
          isAudio: null,
          isText: null,
          isAlbum: null,
          isUser: null,
          // The User Avatar
          avatar: null
        },
        ...reply.locals,
        ...request.session
      }

      done()
    }
  })
}
