import { Router } from 'express'

/*
 *  Home             /
 *  Upload           /upload
 *  Login            /login
 *  Signup           /signup
 */

export default Router()

  // GET Method Routes
  .get('/', (req, res, next) => res.render('index', {
    title_fragment: 'home',
    route: `${req.baseUrl}${req.path}`
  }))
  .get('/login', (req, res, next) => res.render('debug', {
    title_fragment: 'login',
    route: `${req.baseUrl}${req.path}`
  }))
  .get('/signup', (req, res, next) => res.render('debug', {
    title_fragment: 'signup',
    route: `${req.baseUrl}${req.path}`
  }))

  // POST Method Routes
  .post('/upload', (req, res, next) => res.sendStatus(200))

  // Method Not Implimented
  .all('/', (req, res, next) => next(createError(501)))
  .all('/login', (req, res, next) => next(createError(501)))
  .all('/signup', (req, res, next) => next(createError(501)))
  .all('/upload', (req, res, next) => next(createError(501)))