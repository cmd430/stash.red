import { isDevEnv } from 'cmd430-utils'

export default function fastifiyDefaultLocals () {
  return Object.values({
    hook: 'preHandler',
    handler (req, reply, done) {
      reply.locals = {
        title: 'stash.red',
        openGraph: {
          site: req.hostname,
          title: null,
          description: null,
          theme: isDevEnv() ? '#db0303' : '#3889ea', // TODO: load from config
          url: `${req.protocol}://${req.hostname}${req.originalUrl}`,
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
