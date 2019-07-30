import { Router } from 'express'

export default Router()
.get('/', (req, res, next) => res.render('index', { // GET home page.
  title_fragment: 'home'
}))
