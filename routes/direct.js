
import { join } from 'path'
import express, { Router } from 'express'
import createError from 'http-errors'

/*
 *  Direct Links
 */

export default Router()

  // Serve Static
  .use(express.static(join(__dirname,'..', 'storage', 'image')))
  .use(express.static(join(__dirname,'..', 'storage', 'audio')))
  .use(express.static(join(__dirname,'..', 'storage', 'video')))
  .use(express.static(join(__dirname,'..', 'storage', 'text')))

  // GET Method Routes
  .get('/', (req, res, next) => res.redirect(`${req.protocol}://${req.hostname.replace('direct.', '')}`))

  // Method Not Allowed
  .all('/', (req, res, next) => {
    if (req.method !== 'GET') return next(createError(405, {headers: { Allow: 'GET' }}))
    next()
  })
