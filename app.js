const path = require('path')

const express = require('express')
const requestId = require('express-request-id')
const { morgan } = require('./logger.js')
const createError = require('http-errors')

const config = {
  stash: require('./configs/stash.json5')
}

const routes = {
  index: require('./routes/index.js')
}

const app = express()

// allow reverse proxy
app.set('trust proxy', true)

// view engine setup
app.set('view engine', 'hbs')
app.set('views', path.join(__dirname, 'views'))
require('./renderer.js')(app)

// locals
app.locals.title = config.stash.server.name

// middleware setup
app.use(requestId())
app.use(morgan())
app.use(express.json())
app.use(express.static(path.join(__dirname, 'public')))

app.use('/', routes.index)

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

module.exports = app