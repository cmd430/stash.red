import { Router } from 'express'
import createError from 'http-errors'

export default Router()
  .get('/', (req, res, next) => res.render('index', { title_fragment: 'home' })) // homepage.
  .post('/', (req, res, next) => res.sendStatus(200))                            // handle uploads from homepage.
  .all('/', (req, res, next) => next(createError(501)))                          // handle unused methods