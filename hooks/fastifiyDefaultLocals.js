import { isDevEnv } from 'cmd430-utils'
import { config } from '../config/config.js'

const { siteTheme } = config.render

export default function fastifiyDefaultLocals () {
  return Object.values({
    hook: 'preHandler',
    handler (req, reply, done) {
      const base = req.url.split('?')[0]

      reply.locals = {
        base: `${base}${base.endsWith('/') ? '' : '/'}`,
        title: 'stash.red',
        openGraph: {
          site: req.hostname,
          title: null,
          description: null,
          theme: isDevEnv() ? siteTheme.dev : siteTheme.prod,
          url: `${req.protocol}://${req.hostname}${req.url}`,
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
        ...req.session
      }

      done()
    }
  })
}
