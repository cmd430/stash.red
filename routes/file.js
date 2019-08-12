import { unlink } from 'fs'
import { join } from 'path'
import express, { Router } from 'express'
import createError from 'http-errors'
import database from 'better-sqlite3-helper'
import { getExtension } from 'mime'

/*
 *  File             /f/<id>
 *  File Settings    /f/<id>/settings
 *  Update File      /f/<id>/update
 *  Delete File      /f/<id>/delete
 *  Download File    /f/<id>/download
 */

export default Router()

  .use((req, res, next) => {
    req.viewJson = Object.keys(req.query).includes('json')
      ? true
      : false
    next()
  })

  // GET Method Routes
  .get('/:file_id', (req, res, next) => {
    let file_id = req.params.file_id
    let file = database().queryFirstRow(`SELECT id, file_id, mimetype, uploaded_by FROM files WHERE file_id=?`, file_id)
    if (file) {
      res.locals.file = [file].map(file => {
        delete file.id
        return file
      })[0]

      return req.viewJson
        ? res.json(res.locals)
        : res.render('file')
    }
    next()
  })
  .use('/:file_id/thumbnail', (req, res, next) => {
    express.static(join(__dirname, '..', 'storage', 'thumbnail', `${req.params.file_id}.webp`))(req, res, next)
  })

  // PATCH Method Routes
  .patch('/:file_id/update', (req, res, next) => res.sendStatus(200))

  // DELETE Method Routes
  .delete('/:file_id/delete', (req, res, next) => {
    let user = req.isAuthenticated()

    if (!user) return next(createError(401))

    let file_id = req.params.file_id

    try {
      let mimetype = database().queryFirstCell('SELECT mimetype FROM files WHERE file_id=? AND uploaded_by=?', file_id, user.username)

      unlink(join(__dirname, '..', 'storage', 'thumbnail', `${file_id}.webp`), err => {
        if (err) {
          if (err.code !== 'ENOENT') return res.sendStatus(405)
        }
      })
      unlink(join(__dirname, '..', 'storage', mimetype.split('/').reverse().pop(), `${file_id}.${getExtension(mimetype)}`), err => {
        if (err) {
          if (err.code !== 'ENOENT') return res.sendStatus(405)
        }
      })

      database().run('DELETE FROM files WHERE file_id=? AND uploaded_by=?', file_id, user.username)
    } catch (err) {
      return res.sendStatus(405)
    }

    res.sendStatus(204)
  })

  // Method Not Allowed
  .all('/:file_id', (req, res, next) => {
    if (req.method !== 'GET') return next(createError(405, {headers: { Allow: 'GET' }}))
    next()
  })
  .all('/:file_id/thumbnail', (req, res, next) => {
    if (req.method !== 'GET') return next(createError(405, {headers: { Allow: 'GET' }}))
    next()
  })
  .all('/:file_id/update', (req, res, next) => {
    if (req.method !== 'PATCH') return next(createError(405, {headers: { Allow: 'PATCH' }}))
    next()
  })
  .all('/:file_id/delete', (req, res, next) => {
    if (req.method !== 'DELETE') return next(createError(405, {headers: { Allow: 'DELETE' }}))
    next()
  })
