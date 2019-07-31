import { Router } from 'express'
import createError from 'http-errors'

/*
 *  File             /f/<id>
 *  File Settings    /f/<id>/settings
 *  Update File      /f/<id>/update
 *  Delete File      /f/<id>/delete
 *  Download File    /f/<id>/download
 */

export default Router()

  // GET Method Routes
  .get('/', (req, res, next) => res.render('debug', {
    title_fragment: 'file',
    route: `${req.baseUrl}${req.path}`
  }))

  // POST Method Routes
  .post('/', (req, res, next) => res.sendStatus(200))

  // Method Not Implimented
  .all('/', (req, res, next) => next(createError(501)))
