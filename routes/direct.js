import { Router } from 'express'
import createError from 'http-errors'
import { debug } from '../utils/logger'
/*
 *  Direct Links
 */

export default Router()

  // GET Method Routes
  .get('/', (req, res, next) => res.redirect(`${req.protocol}://${req.hostname.split(`${req.subdomains[0]}.`)[1]}`))
  .get('/:file', (req, res, next) => {

    debug(req.params.file)
    debug(req.subdomains.toString())

    let title_fragment
    switch (req.subdomains.toString()) {
      case config.server.subdomains.image:
        title_fragment = 'image'
        break
      case config.server.subdomains.audio:
        title_fragment = 'audio'
        break
      case config.server.subdomains.video:
        title_fragment = 'video'
        break
      default:
        title_fragment = 'direct'
    }
    res.render('debug', {
      title_fragment: title_fragment,
      route: `${req.baseUrl}${req.path}`
    })
  })

  // Method Not Implimented
  .all('/', (req, res, next) => next(createError(501)))
  .all('/:file', (req, res, next) => next(createError(501)))
