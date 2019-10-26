import { join } from 'path'
import express from 'express'
import compression from 'compression'
import requestId from 'express-request-id'
import compileSass from 'express-compile-sass'
import session from 'express-session'
import cookieParser from 'cookie-parser'
import zip from 'express-easy-zip'
import expressSqlite3 from 'express-sqlite3'
import busboy from 'connect-busboy'
import favicon  from 'serve-favicon'
import subdomain from 'express-subdomain'
import cors from 'cors'
import { error, expressResponseLogging, expressRequestLogging } from './utils/logger'
import viewEngine from './utils/renderer'
import createError from 'http-errors'
import { clearDeadCookies } from './utils/helpers'

import routes_index from './routes/index'
import routes_user from './routes/user'
import routes_file from './routes/file'
import routes_album from './routes/album'
import routes_direct from './routes/direct'

const app = express()
const www = join(__dirname, 'public')
const database = join(__dirname, 'storage', 'database')
const sessionStore = expressSqlite3(session)

// allow reverse proxy
app.set('trust proxy', true)

// view engine setup
app.set('view engine', 'hbs')
app.set('views', join(__dirname, 'views'))
viewEngine(app)

// https upgrade
app.use((req, res, next) => {
  if (config.server.https && !req.secure) return res.redirect(301, `https://${req.headers.host}${req.originalUrl}`)
  next()
})

// middleware setup
app.use(session({
  secret: config.auth.session.secret,
  resave: false,
  rolling: true,
  saveUninitialized: false,
  unset: 'destroy',
  name: 'sid',
  cookie: config.auth.session.cookie,
  store: new sessionStore({
    path: join(database, 'sessions.db'),
    WAL: true
  })
}))
app.use(favicon(join(www, 'favicon.ico')))
app.use(compression())
app.use(requestId())
app.use(expressRequestLogging())
app.use(expressResponseLogging())
app.use(cors({ exposedHeaders: ['Content-Length'] }))
app.use(compileSass({
  root: www,
  sourceMap: true,
  sourceComments: false,
  watchFiles: true,
  logToConsole: false
}))
app.use(cookieParser())
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(express.static(www))
app.use(clearDeadCookies('sid'))
app.use((req, res, next) => {
  req.isAuthenticated = () => {
    if (req.session && req.session.user && req.session.user.username) return req.session.user
    return false
  }
  res.locals.env = config.server.env
  res.locals.title = req.hostname
  res.locals.signedin = req.session.user
  res.locals.path = `${req.baseUrl}${req.path}${req.path.endsWith('/') ? '' : '/'}`
  res.locals.direct = `${req.protocol}://direct.${req.hostname}`
  res.locals.og = {
    site: res.locals.title,
    theme: '#db0303'
  }
  next()
})
app.use(zip())
app.use(busboy(config.upload))


// subdomain routes
app.use(subdomain('direct', routes_direct))

// domain routes
app.use('/', routes_index)
app.use('/u/', routes_user)
app.use('/f/', routes_file)
app.use('/a/', routes_album)

// catch 404 and forward to error handler
app.use((req, res, next) => {
  next(createError(404))
})

// error handler
app.use((err, req, res, next) => {
  // set locals, only providing error in development
  res.locals.message = err.message
  res.locals.error = req.app.get('env') === 'development' ? err : {}

  if (err.status >= 500 || !err.status) error(err.stack)

  // render the error page
  res.set(err.headers)
  res.status(err.status || 500)
  res.render('error')
})

export default app
