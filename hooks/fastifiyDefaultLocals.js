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
          theme: isDevEnv() ? siteTheme.dev : siteTheme.prod, // TODO: load from config
          url: `${req.protocol}://${req.hostname}${req.url}`,
          // The feilds set by the thing are viewing
          image: null,
          video: null,
          audio: null,
          text: null,
          isFile: null,
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
