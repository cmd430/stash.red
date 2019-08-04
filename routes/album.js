import { Router } from 'express'
import createError from 'http-errors'
import database from 'better-sqlite3-helper'

/*
 *  Album            /a/<id>
 *  Add File         /a/<id>/upload
 *  Album Settings   /a/<id>/settings
 *  Update Album     /a/<id>/update
 *  Delete Album     /a/<id>/delete
 *  Download Album   /a/<id>/download
 */

export default Router()

  // GET Method Routes
  .get('/:album_id', (req, res, next) => {
    let album_id = req.params.album_id
    let limit = config.pagination.limit
    let page = req.query.page || 0
    let album_title = database().queryFirstCell(`SELECT title,  FROM albums WHERE id=?`, album_id)
    if (album_title) {
      let files = database().query(`SELECT * FROM files WHERE in_album=? ORDER BY file_uploaded_at LIMIT ? OFFSET ?`, album_id, limit, page)
      return res.render('debug', {
        title_fragment: album_title || 'Album',
        route: `${req.baseUrl}${req.path}`,
        files: files
      })
    }
    next()
  })

  // POST Method Routes
  .post('/:album_id/upload', (req, res, next) => res.sendStatus(200))
  .post('/:album_id/update', (req, res, next) => res.sendStatus(200))

  // Method Not Implimented
  .all('/:album_id/upload', (req, res, next) => {
    if (!req.method === 'POST') return next(createError(501))
    next()
  })
  .all('/:album_id/update', (req, res, next) => {
    if (!req.method === 'POST') return next(createError(501))
    next()
  })
  .all('*', (req, res, next) => {
    if (!req.method === 'GET') return next(createError(501))
    next()
  })
