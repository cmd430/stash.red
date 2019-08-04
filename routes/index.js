import { Router } from 'express'
import database from 'better-sqlite3-helper'
import { createID, hash, validate } from '../utils/helpers'
import { error } from '../utils/logger'
import createError from 'http-errors'
import expressCaptcha from 'express-svg-captcha'

const captcha = new expressCaptcha(config.auth.captcha)

/*
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
    res.render('index', {})
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
    return res.redirect('/')
  })
  .get('/captcha', captcha.generate())

  .get('/debug', async (req, res, next) => {
    try { // Add single file
      database().insert('files', {
        uploaded_by: 'cmd430',
        uploaded_at: new Date().toISOString(),
        file_id: createID(),
        original_filename: 'image.jpg',
        mimetype: 'image/jpg',
        filesize: 3255564,
        in_album: null,
        public: +true
      })
    } catch (err) {
      // Error
      error(err.message)
    }
    try { // Add album with 2 files
      const insert_album = database().prepare(`INSERT INTO albums (album_id, title, uploaded_by, uploaded_at, public)
                                               VALUES (@album_id, @title, @uploaded_by, @uploaded_at, @public)`)
      const insert_file = database().prepare(`INSERT INTO files (file_id, uploaded_by, uploaded_at, original_filename, mimetype, filesize, in_album, public)
                                              VALUES (@file_id, @uploaded_by, @uploaded_at, @original_filename, @mimetype, @filesize, @in_album, @public)`)
      const insert_files = database().transaction(files => { for (const file of files) insert_file.run(file) })
      const create_album = database().transaction(album => {
        insert_album.run(album)
        insert_files([
          {
            uploaded_by: 'cmd430',
            uploaded_at:  album.uploaded_at,
            file_id: createID(),
            original_filename: 'image.jpg',
            mimetype: 'image/jpg',
            filesize: 3255564,
            in_album: album.album_id,
            public: +true
          },
          {
            uploaded_by: 'cmd430',
            uploaded_at: album.uploaded_at,
            file_id: createID(),
            original_filename: 'image3.jpg',
            mimetype: 'image/jpg',
            filesize: 125524,
            in_album: album.album_id,
            public: +true
          }
        ])
      })
      create_album({
        album_id: createID(),
        title: 'TEST ALBUM',
        uploaded_by: 'cmd430',
        uploaded_at: new Date().toISOString(),
        public: +true
      })
    } catch (err) {
      // Error
      error(err.message)
    }
    res.render('debug', {
      title_fragment: 'debug',
      route: `${req.baseUrl}${req.path}`,
      users: database().query(`SELECT * FROM users`),
      albums: database().query(`SELECT * FROM albums`),
      files: database().query(`SELECT * FROM files`)
    })
  })

  // POST Method Routes
  .post('/login', async (req, res, next) => {
    if (!req.body.username
     || !req.body.password
     || (config.auth.captcha.enabled.login && !req.body.captcha)
    ) return next(createError(400, 'All Fields Required'))
    if (config.auth.captcha.enabled.login
     && !captcha.validate(req, req.body.captcha)
    ) return next(createError(400, 'Captcha Failed'))

    try {
      let user = database().queryFirstRow(`SELECT id, username, password FROM users WHERE username=?`, req.body.username)
      if (await validate(req.body.password, user.password)) req.session.user = {
        id: user.id,
        username: user.username
      }
    } catch (err) {
      error(err.message)
      return next(createError(401))
    }
    return res.redirect('/')
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
    return res.status(201).redirect('/')
  })
  .post('/upload', (req, res, next) => res.sendStatus(200))

  // Method Not Implimented
  .all('/', (req, res, next) => next(createError(501)))
  .all('/login', (req, res, next) => next(createError(501)))
  .all('/signup', (req, res, next) => next(createError(501)))
  .all('/logout', (req, res, next) => next(createError(501)))
  .all('/captcha', (req, res, next) => next(createError(501)))
  .all('/upload', (req, res, next) => next(createError(501)))