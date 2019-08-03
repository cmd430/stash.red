import { Router } from 'express'
import database from 'better-sqlite3-helper'
import { createID, hash } from '../utils/helpers'
import { error } from '../utils/logger'

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

  .get('/debug', async (req, res, next) => {
    try { // Add user
      database().insert('users', {
        username: 'cmd430',
        password: await hash('hunter2'),
        email: 'email@address.com'
      })
    } catch (err) {
      // Error
      error(err.message)
    }
    try { // Add single file
      let id = createID()
      database().insert('files', {
        uploaded_by: 'cmd430',
        uploaded_at: new Date().toUTCString(),
        file_id: id,
        filename: `${id}.jpg`,
        original_name: 'image.jpg',
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
      const upload_time = new Date().toUTCString()
      const album_id = createID()
      const insert_album = database().prepare(`INSERT INTO albums (album_id, title, uploaded_by, uploaded_at, total_files, public) VALUES (@album_id, @title, @uploaded_by, @uploaded_at, @total_files, @public)`)
      const insert_file = database().prepare(`INSERT INTO files (file_id, uploaded_by, uploaded_at, filename, original_name, mimetype, filesize, in_album, public) VALUES (@file_id, @uploaded_by, @uploaded_at, @filename, @original_name, @mimetype, @filesize, @in_album, @public)`)
      const insert_files = database().transaction(files => { for (const file of files) insert_file.run(file) })
      const create_album = database().transaction(album => {
        insert_album.run(album)
        const file_id = createID()
        const file_id2 = createID()
        insert_files([
          {
            uploaded_by: 'cmd430',
            uploaded_at: upload_time,
            file_id: file_id,
            filename: `${file_id}.jpg`,
            original_name: 'image.jpg',
            mimetype: 'image/jpg',
            filesize: 3255564,
            in_album: album_id,
            public: +true
          },
          {
            uploaded_by: 'cmd430',
            uploaded_at: upload_time,
            file_id: file_id2,
            filename: `${file_id2}.jpg`,
            original_name: 'image3.jpg',
            mimetype: 'image/jpg',
            filesize: 125524,
            in_album: album_id,
            public: +true
          }
        ])
      })
      create_album({
        album_id: album_id,
        title: 'TEST ALBUM',
        uploaded_by: 'cmd430',
        uploaded_at: upload_time,
        total_files: 2,
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
  .post('/upload', (req, res, next) => res.sendStatus(200))

  // Method Not Implimented
  .all('/', (req, res, next) => next(createError(501)))
  .all('/login', (req, res, next) => next(createError(501)))
  .all('/signup', (req, res, next) => next(createError(501)))
  .all('/upload', (req, res, next) => next(createError(501)))