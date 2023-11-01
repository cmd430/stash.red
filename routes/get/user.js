import { createHash } from 'node:crypto'
import { Log } from 'cmd430-utils'
import createError from 'http-errors'
import { config } from '../../config/config.js'
import { mimetypeFilter } from '../../utils/mimetype.js'

// eslint-disable-next-line no-unused-vars
const { log, debug, info, warn, error } = new Log('Home')
const { pagination } = config.render

// NOTE: url params = ?p=<Number>&sort=<ASC|DESC>&filter=<image|text|audio|video>&limit=<Number(Max=70)>

function preHandler (req, reply, done) {
  const {
    sort = 'DESC',
    filter = '',
    limit = pagination.limit.default,
    p = 1
  } = req.query

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

  req.view = {
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
  fastify.get('/u/:username', { preHandler }, async (req, reply) => {
    const { page, limit, offset, order, filter, params } = req.view
    const { username } = req.params
    const showPrivate = req.session.get('authenticated') && req.session.get('session').username === username

    const user = fastify.betterSqlite3
      .prepare('SELECT email FROM accounts WHERE username = ?')
      .get(username)

    // If the user not exist return a 404
    if (!user) return createError(404)

    const { email } = user
    // Get Files
    const getFilesIncludePrivate = fastify.betterSqlite3
      .prepare(`SELECT id, type, isPrivate, total FROM userFiles WHERE uploaded_by = ? AND type LIKE '${filter}%' ORDER BY uploaded_at ${order} LIMIT ? OFFSET ?`)
    const getFilesExcludePrivate = fastify.betterSqlite3
      .prepare(`SELECT id, type, isPrivate, total FROM userFiles WHERE uploaded_by = ? AND NOT isPrivate = 1 AND type LIKE '${filter}%' ORDER BY uploaded_at ${order} LIMIT ? OFFSET ?`)

    // Run SQL
    const files = (showPrivate ? getFilesIncludePrivate : getFilesExcludePrivate)
      .all(username, limit, offset)
      .map(file => ({
        ...file,
        type: mimetypeFilter(file.type)
      }))

    const { total } = files[0] ?? 0

    // Return Page
    return reply.view('user', {
      pagination: {
        params: params.length > 0 ? `&${params.join('&')}` : '',
        page: page,
        pageCount:  Math.max(1, Math.ceil(total / limit))
      },
      view: {
        username: username,
        type: 'files'
      },
      uploads: files,
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
  fastify.get('/u/:username/albums', { preHandler }, async (req, reply) => {
    const { page, limit, offset, order, params } = req.view
    const { username } = req.params
    const showPrivate = req.session.get('authenticated') && req.session.get('session').username === username

    const user = fastify.betterSqlite3
      .prepare('SELECT email FROM accounts WHERE username = ?')
      .get(username)

    // If the user not exist then we get no email, return a 404
    if (!user) return createError(404)

    const { email } = user
    // Get Albums
    const getAlbumsIncludePrivate = fastify.betterSqlite3
      .prepare(`SELECT id, title, isPrivate, entries, total FROM userAlbums WHERE uploaded_by = ? ORDER BY uploaded_at ${order} LIMIT ? OFFSET ?`)
    const getAlbumsExcludePrivate = fastify.betterSqlite3
      .prepare(`SELECT id, title, isPrivate, entries, total FROM userAlbums WHERE uploaded_by = ? AND NOT isPrivate = 1  ORDER BY uploaded_at ${order} LIMIT ? OFFSET ?`)

    // Run SQL
    const albums = (showPrivate ? getAlbumsIncludePrivate : getAlbumsExcludePrivate).all(username, limit, offset)
    const { total } = albums[0] ?? 0

    // Return Page
    return reply.view('user', {
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

  done()
}
