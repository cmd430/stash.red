import { Router } from 'express'
import database from 'better-sqlite3-helper'
import { hash, validate } from '../utils/helpers'
import upload from '../utils/uploader'
import { error } from '../utils/logger'
import createError from 'http-errors'
import expressCaptcha from 'express-svg-captcha'

const captcha = new expressCaptcha(config.auth.captcha)

/**
 *  Home             /
 *  Upload           /upload
 *  Login            /login
 *  Signup           /signup
 *  Logout           /logout
 *  Captcha          /captcha
 */

export default Router()

  // GET Method Routes
  .get('/', (req, res, next) => {
    res.render('index')
  })
  .get('/login', (req, res, next) => {
    res.render('login', {
      captcha: config.auth.captcha.enabled.login
    })
  })
  .get('/signup', (req, res, next) => {
    if (!config.auth.allowSignup) return next(createError(503, 'Account Creation Disabled'))

    res.render('signup', {
      captcha: config.auth.captcha.enabled.signup
    })
  })
  .get('/logout', (req, res, next) => {
    if (req.session) req.session.destroy()

    res.redirect('/')
  })
  .get('/captcha', captcha.generate())
  .get('/debug', (req, res, next) => {
    if (config.server.env.includes('prod')) return next(createError(403))
    res.render('debug', {})
  })

  // POST Method Routes
  .post('/upload', upload)
  .post('/login', async (req, res, next) => {
    if (!req.body.username
     || !req.body.password
     || (config.auth.captcha.enabled.login && !req.body.captcha)
    ) return next(createError(400, 'All Fields Required'))
    if (config.auth.captcha.enabled.login
     && !captcha.validate(req, req.body.captcha)
    ) return next(createError(400, 'Captcha Failed'))

    try {
      let user = database().queryFirstRow(`SELECT id, username, password, admin FROM users WHERE username=?`, req.body.username)
      if (await validate(req.body.password, user.password)) req.session.user = {
        id: user.id,
        username: user.username,
        admin: !!+user.admin
      }
    } catch (err) {
      error(err.message)
      return next(createError(401))
    }

    res.redirect('/')
  })
  .post('/signup', async (req, res, next) => {
    if (!config.auth.allowSignup) return next(createError(503, 'Account Creation Disabled'))
    if (!req.body.username
     || !req.body.password
     || !req.body.passwordConfirm
     || !req.body.email
     || (config.auth.captcha.enabled.signup && !req.body.captcha)
    ) return next(createError(400, 'All Fields Required'))
    if (config.auth.captcha.enabled.signup
     && !captcha.validate(req, req.body.captcha)
    ) return next(createError(400, 'Captcha Failed'))
    if (req.body.password !== req.body.passwordConfirm) return next(createError(400, 'Passwords Don\'t Match'))

    try {
      req.session.user = {
        id: database().insert('users', {
          username: req.body.username,
          password: await hash(req.body.password),
          email: req.body.email
        }),
        username: req.body.username
      }
    } catch (err) {
      error(err.message)
      return next(createError(409))
    }

    res.status(201).redirect('/')
  })

  // Method Not Allowed
  .all('/', (req, res, next) => {
    if (req.method !== 'GET') return next(createError(405, {headers: { Allow: 'GET' }}))
    next()
  })
  .all('/login', (req, res, next) => {
    if (req.method !== 'GET' || req.method !== 'POST') return next(createError(405, {headers: { Allow: 'GET, POST' }}))
    next()
  })
  .all('/signup', (req, res, next) => {
    if (req.method !== 'GET' || req.method !== 'POST') return next(createError(405, {headers: { Allow: 'GET, POST' }}))
    next()
  })
  .all('/logout', (req, res, next) => {
    if (req.method !== 'GET') return next(createError(405, {headers: { Allow: 'GET' }}))
    next()
  })
  .all('/captcha', (req, res, next) => {
    if (req.method !== 'GET') return next(createError(405, {headers: { Allow: 'GET' }}))
    next()
  })
  .all('/upload', (req, res, next) => {
    if (req.method !== 'POST') return next(createError(405, {headers: { Allow: 'POST' }}))
    next()
  })
