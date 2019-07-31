import { Router } from 'express'
import createError from 'http-errors'

/*
 *  User Files       /u/<:username>
 *  User Albums      /u/<:username>/albums
 *  User Settings    /u/<:username>/settings
 *  User Update      /u/<:username>/update
 */

export default Router()

  // GET Method Routes
  .get('/', (req, res, next) => res.render('debug', {
    title_fragment: 'user',
    route: `${req.baseUrl}${req.path}`
  }))
  .get('/albums', (req, res, next) => res.render('debug', {
    title_fragment: 'user albums',
    route: `${req.baseUrl}${req.path}`
  }))
  .get('/settings', (req, res, next) => res.render('debug', {
    title_fragment: 'user settings',
    route: `${req.baseUrl}${req.path}`
  }))

  // POST Method Routes
  .post('/update', (req, res, next) => res.sendStatus(200))

  // Method Not Implimented
  .all('/', (req, res, next) => next(createError(501)))
  .all('/albums', (req, res, next) => next(createError(501)))
  .all('/settings', (req, res, next) => next(createError(501)))
  .all('/update', (req, res, next) => next(createError(501)))