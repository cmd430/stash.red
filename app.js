import express from 'express'
import requestId from 'express-request-id'
import compileSass  from 'express-compile-sass'
import { expressResponseLogging, expressRequestLogging } from './utils/logger'
import viewEngine from './utils/renderer'
import createError from 'http-errors'
import { join } from 'path'

import route_index from './routes/index'

const app = express()

// allow reverse proxy
app.set('trust proxy', true)

// view engine setup
app.set('view engine', 'hbs')
app.set('views', join(__dirname, 'views'))
viewEngine(app)

// locals
app.locals.title = config.server.name

// middleware setup
app.use(requestId())
app.use(expressRequestLogging())
app.use(expressResponseLogging())
app.use(compileSass({
  root: join(__dirname, 'public'),
  sourceMap: true,
  sourceComments: false,
  watchFiles: true,
  logToConsole: false
}))
app.use(express.json())
app.use(express.static(join(__dirname, 'public')))

// routes
app.use('/', route_index)

// catch 404 and forward to error handler
app.use((req, res, next) => {
  next(createError(404))
})

// error handler
app.use((err, req, res, next) => {
  // set locals, only providing error in development
  res.locals.message = err.message
  res.locals.error = req.app.get('env') === 'development' ? err : {}

  // render the error page
  res.status(err.status || 500)
  res.render('error')
})

export default app