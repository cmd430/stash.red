import { createHash } from 'node:crypto'
import { Log } from 'cmd430-utils'
import { config } from '../../config/config.js'
import { mimetypeFilter } from '../../utils/mimetype.js'

// eslint-disable-next-line no-unused-vars
const { log, debug, info, warn, error } = new Log('Home')
const { pagination } = config.render

// INFO: url params = ?p=<Number>&sort=<ASC|DESC>&filter=<image|text|audio|video>&limit=<Number(Max=70)>

function preHandler (request, reply, done) {
  const {
    sort = 'DESC',
    filter = '',
    limit = pagination.limit.default,
    p = 1
  } = request.query

  const viewPage = p
  // eslint-disable-next-line no-nested-ternary
  const viewLimit = (limit > pagination.limit.max ? pagination.limit.default : (limit > 0 ? limit : pagination.limit.default))
  const viewOffset = viewLimit * (viewPage - 1)
  const viewOrder = (sort !== 'DESC' && sort !== 'ASC') ? 'DESC' : sort
  const viewFilter = (filter !== 'image' && filter !== 'audio' && filter !== 'video' && filter !== 'text') ? '' : filter
  const viewParams = []

  if (viewFilter !== '') viewParams.push(`filter=${viewFilter}`)
  if (viewOrder !== 'DESC') viewParams.push(`sort=${viewOrder}`)
  if (viewLimit !== pagination.limit.default) viewParams.push(`limit=${viewLimit}`)

  request.view = {
    page: viewPage,
    limit: viewLimit,
    offset: viewOffset,
    order: viewOrder,
    filter: viewFilter,
    params: viewParams
  }

  done()
}

export default function (fastify, opts, done) {

  // User Files page
  fastify.get('/u/:username', { preHandler }, async (request, reply) => {
    const { page, limit, offset, order, filter, params } = request.view
    const { username } = request.params
    const includePrivate = request.session.get('authenticated') && request.session.get('session').username === username
    const { succeeded , code, data } = await fastify.db.getUserFiles(username, {
      offset: offset,
      limit: limit,
      order: order,
      filter: filter,
      includePrivate: includePrivate
    })

    if (succeeded === false) return reply.error(code)

    const { files, email, total } = data

    // Return Page
    return reply
      .disableCache()
      .view('user', {
        pagination: {
          params: params.length > 0 ? `&${params.join('&')}` : '',
          page: page,
          pageCount:  Math.max(1, Math.ceil(total / limit))
        },
        view: {
          username: username,
          type: 'files'
        },
        uploads: files.map(file => ({
          ...file,
          type: mimetypeFilter(file.type)
        })),
        openGraph: {
          title: username,
          description: `A User Profile for ${reply.locals.title}`,
          avatar: `https://www.gravatar.com/avatar/${createHash('md5')
            .update(email.toLowerCase())
            .digest('hex')}`,
          isUser: true
        }
      })
  })

  // User Albums page
  fastify.get('/u/:username/albums', { preHandler }, async (request, reply) => {
    const { page, limit, offset, order, params } = request.view
    const { username } = request.params
    const includePrivate = request.session.get('authenticated') && request.session.get('session').username === username
    const { succeeded , code, data } = await fastify.db.getUserAlbums(username, {
      offset: offset,
      limit: limit,
      order: order,
      includePrivate: includePrivate
    })

    if (succeeded === false) return reply.error(code)

    const { albums, email, total } = data

    // Return Page
    return reply
      .disableCache()
      .view('user', {
        pagination: {
          params: params.join('&'),
          page: page,
          pageCount:  Math.max(1, Math.ceil(total / limit))
        },
        view: {
          username: username,
          type: 'albums'
        },
        uploads: albums,
        openGraph: {
          title: username,
          description: `A User Profile for ${reply.locals.title}`,
          avatar: `https://www.gravatar.com/avatar/${createHash('md5')
            .update(email.toLowerCase())
            .digest('hex')}`,
          isUser: true
        }
      })
  })

  // Account Info
  fastify.get('/u/:username/info', async (request, reply) => {
    const { username } = request.params
    const { succeeded , code, data } = await fastify.db.getUserInfo(username)

    if (succeeded === false) return reply.error(code)

    const { totalAlbums, totalFiles, totalSize } = data

    return reply
      .disableCache()
      .view('info', {
        username: username,
        totalAlbums: totalAlbums,
        totalFiles: totalFiles,
        totalSize: totalSize
      })
  })

  done()
}
