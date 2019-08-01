
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

  // GET Method Routes
  .get('/', (req, res, next) => res.redirect(`${req.protocol}://${req.hostname.replace('direct.', '')}`))

  // Method Not Implimented
  .all('/', (req, res, next) => next(createError(501)))