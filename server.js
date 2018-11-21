const express = require('express')
const logger = require('morgan')
const responseTime = require('response-time')
const subdomain = require('express-subdomain')
const cors = require('cors')
const mongoose = require('mongoose')
const config = require('./config.js')
const app = {
  domain: express(),
  subdomain: {
    image: express.Router(),
    audio: express.Router(),
    video: express.Router(),
    static: express.Router()
  },
  db: mongoose
}
const multer = require('multer')()

if (config.mongo.auth.enabled) {
  app.db.connect(`mongodb://${config.mongo.user}:${config.mongo.pass}@${config.mongo.host}:${config.mongo.port}/${config.mongo.db}`, {
    useCreateIndex: true,
    useNewUrlParser: true
  })
} else {
  app.db.connect(`mongodb://${config.mongo.host}:${config.mongo.port}/${config.mongo.db}`, {
    useCreateIndex: true,
    useNewUrlParser: true
  })
}

app.domain.use(responseTime())
app.domain.use(logger(config.log))
app.domain.use(cors())
app.domain.use(subdomain('image', app.subdomain.image))
app.domain.use(subdomain('audio', app.subdomain.audio))
app.domain.use(subdomain('video', app.subdomain.video))
app.domain.use(subdomain('static', app.subdomain.static))

require('./routes/routes.js')(config, multer, app)

app.domain.listen(config.port, () => console.log('\'TheShed.red\' online'))