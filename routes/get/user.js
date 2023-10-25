import { createHash } from 'node:crypto'
import { Log } from 'cmd430-utils'
import createError from 'http-errors'
import { config } from '../../config/config.js'

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
  const viewParams = [ `p=${p}` ]

  if (viewFilter !== '') viewParams.push(`filter=${viewFilter}`)
  if (viewOrder !== '') viewParams.push(`sort=${viewOrder}`)
  if (viewLimit !== '') viewParams.push(`limit=${viewLimit}`)

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
    const showPrivate = req.session.get('authenticated') && req.session.get('user').username === username

    const user = fastify.betterSqlite3
      .prepare('SELECT email FROM accounts WHERE username = ?')
      .get(username)

    // If the user not exist return a 404
    if (!user) return createError(404)

    const { email } = user
    // Get Files
    const getFilesIncludePrivate = fastify.betterSqlite3
      .prepare(`SELECT id, file, type, isPrivate FROM files WHERE uploaded_by = ? AND inAlbum IS NULL AND type LIKE '${filter}%' ORDER BY _id ${order} LIMIT ? OFFSET ?`)
    const getFilesExcludePrivate = fastify.betterSqlite3
      .prepare(`SELECT id, file, type, isPrivate FROM files WHERE uploaded_by = ? AND inAlbum IS NULL AND NOT isPrivate = 1 AND type LIKE '${filter}%' ORDER BY _id ${order} LIMIT ? OFFSET ?`)
    // Get Totals
    const getTotalFilesIncludePrivate = fastify.betterSqlite3
      .prepare(`SELECT COUNT(id) as total FROM files WHERE uploaded_by = ? AND inAlbum IS NULL AND type LIKE '${filter}%'`)
    const getTotalFilesExcludePrivate = fastify.betterSqlite3
      .prepare(`SELECT COUNT(id) as total FROM files WHERE uploaded_by = ? AND inAlbum IS NULL AND NOT isPrivate = 1 AND type LIKE '${filter}%'`)

    // Run SQL
    const files = (showPrivate ? getFilesIncludePrivate : getFilesExcludePrivate).all(username, limit, offset)
    const { total } = (showPrivate ? getTotalFilesIncludePrivate : getTotalFilesExcludePrivate).get(username)

    // Return Page
    return reply.view('user', {
      pagination: {
        params: params.join('&'),
        page: page,
        pageCount:  Math.max(1, Math.ceil(total / limit))
      },
      view: {
        username: username,
        type: 'files'
      },
      uploads: files,
      openGraphExtended: {
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
    const showPrivate = req.session.get('authenticated') && req.session.get('user').username === username

    const user = fastify.betterSqlite3
      .prepare('SELECT email FROM accounts WHERE username = ?')
      .get(username)

    // If the user not exist then we get no email, return a 404
    if (!user) return createError(404)

    const { email } = user
    // Get Albums
    const getAlbumsIncludePrivate = fastify.betterSqlite3
      .prepare(`SELECT id, title, isPrivate, (SELECT COUNT(id) FROM files WHERE inAlbum = albums.id) AS total FROM albums WHERE uploaded_by = ? ORDER BY _id ${order} LIMIT ? OFFSET ?`)
    const getAlbumsExcludePrivate = fastify.betterSqlite3
      .prepare(`SELECT id, title, isPrivate, (SELECT COUNT(id) FROM files WHERE inAlbum = albums.id) AS total FROM albums WHERE uploaded_by = ? AND NOT isPrivate = 1  ORDER BY _id ${order} LIMIT ? OFFSET ?`)
    // Get Totals
    const getTotalAlbumsIncludePrivate = fastify.betterSqlite3
      .prepare('SELECT COUNT(id) as total FROM albums WHERE uploaded_by = ?')
    const getTotalAlbumsExcludePrivate = fastify.betterSqlite3
      .prepare('SELECT COUNT(id) as total FROM albums WHERE uploaded_by = ? AND NOT isPrivate = 1')

    // Run SQL
    const albums = (showPrivate ? getAlbumsIncludePrivate : getAlbumsExcludePrivate).all(username, limit, offset)
    const { total } = (showPrivate ? getTotalAlbumsIncludePrivate : getTotalAlbumsExcludePrivate).get(username)

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
      openGraphExtended: {
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
