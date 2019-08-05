import { join } from 'path'
import express, { Router } from 'express'
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

  .use((req, res, next) => {
    req.viewJson = Object.keys(req.query).includes('json')
      ? true
      : false
    next()
  })

  // GET Method Routes
  .get('/:album_id', (req, res, next) => {
    let album_id = req.params.album_id
    let album_data = database().queryFirstRow(`SELECT title, uploaded_by FROM albums WHERE album_id=?`, album_id)
    if (album_data) {
      let files = database().query(`SELECT id, file_id, mimetype, uploaded_by FROM files WHERE in_album=? ORDER BY id DESC`, album_id)

      res.locals.album = {
        album_title: album_data.title,
        uploaded_by: album_data.uploaded_by,
        files: files.map(file => {
          delete file.id
          return file
        })
      }

      return req.viewJson
        ? res.json(res.locals)
        : res.render('album')
    }
    next()
  })
  .use('/:album_id/thumbnail', (req, res, next) => {
    let thumbnail_id = database().queryFirstCell(`SELECT file_id FROM files WHERE in_album=? ORDER BY id DESC`, req.params.album_id)
    express.static(join(__dirname, '..', 'storage', 'thumbnail', `${thumbnail_id}.webp`))(req, res, next)
  })

  // POST Method Routes
  .post('/:album_id/upload', (req, res, next) => res.sendStatus(200))

  // PATCH Method Routes
  .patch('/:album_id/update', (req, res, next) => res.sendStatus(200))

  // Method Not Allowed
  .all('/:album_id', (req, res, next) => {
    if (req.method !== 'GET') return next(createError(405, {headers: { Allow: 'GET' }}))
    next()
  })
  .all('/:album_id/thumbnail', (req, res, next) => {
    if (req.method !== 'GET') return next(createError(405, {headers: { Allow: 'GET' }}))
    next()
  })
  .all('/:album_id/update', (req, res, next) => {
    if (req.method !== 'PATCH') return next(createError(405, {headers: { Allow: 'PATCH' }}))
    next()
  })
  .all('/:album_id/upload', (req, res, next) => {
    if (req.method !== 'POST') return next(createError(405, {headers: { Allow: 'POST' }}))
    next()
  })
