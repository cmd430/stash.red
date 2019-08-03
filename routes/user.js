import { Router } from 'express'
import createError from 'http-errors'
import database from 'better-sqlite3-helper'

/*
 *  User Files       /u/<:username>
 *  User Albums      /u/<:username>/albums
 *  User Settings    /u/<:username>/settings
 *  User Update      /u/<:username>/update
 */

// TEMP ONLY
let logged_in_own_page = true

export default Router()
/*
  // Global Method
  .all('*', (req, res, next) => {
    // if logged in set var...
    next()
  })
*/
  // GET Method Routes
  .get('/:username', (req, res, next) => {
    let username = req.params.username
    let limit = config.pagination.limit
    let page = req.query.page || 0
    if (database().queryFirstCell(`SELECT username FROM users WHERE username=?`, username)) {
      let files = logged_in_own_page // logged in user viewing own page
        ? database().query(`SELECT * FROM files WHERE uploaded_by=? AND in_album IS NULL ORDER BY uploaded_at LIMIT ? OFFSET ?`, username, limit, page)
        : database().query(`SELECT * FROM files WHERE uploaded_by=? AND in_album IS NULL AND NOT public=0 ORDER BY uploaded_at LIMIT ? OFFSET ?`, username, limit, page)
      return res.render('debug', {
        title_fragment: username,
        route: `${req.baseUrl}${req.path}`,
        uploads: files
      })
    }
    next()
  })
  .get('/:username/albums', (req, res, next) => {
    let username = req.params.username
    let limit = config.pagination.limit
    let page = req.query.page || 0
    if (database().queryFirstCell(`SELECT username FROM users WHERE username=?`, username)) {
      let albums = logged_in_own_page // logged in user viewing own page
        ? database().query(`SELECT * FROM albums WHERE uploaded_by=? LIMIT ? OFFSET ?`, username, limit, page)
        : database().query(`SELECT * FROM files WHERE uploaded_by=? AND NOT public=0 LIMIT ? OFFSET ?`, username, limit, page)
      return res.render('debug', {
        title_fragment: username,
        route: `${req.baseUrl}${req.path}`,
        albums: albums
      })
    }
    next()
  })
  .get('/:username/settings', (req, res, next) => res.render('debug', {
    title_fragment: 'user settings',
    route: `${req.baseUrl}${req.path}`
  }))

  // POST Method Routes
  .post('/:username/update', (req, res, next) => res.sendStatus(200))

  // Method Not Implimented
  .all('/:username/update', (req, res, next) => {
    if (!req.method === 'POST') return next(createError(501))
    next()
  })
  .all('*', (req, res, next) => {
    if (!req.method === 'GET') return next(createError(501))
    next()
  })