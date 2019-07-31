import { Router } from 'express'
import createError from 'http-errors'

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
  .get('/', (req, res, next) => res.render('debug', {
    title_fragment: 'album',
    route: `${req.baseUrl}${req.path}`
  }))

  // POST Method Routes
  .post('/', (req, res, next) => res.sendStatus(200))

  // Method Not Implimented
  .all('/', (req, res, next) => next(createError(501)))
