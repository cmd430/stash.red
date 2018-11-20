const express = require('express')
const logger = require('morgan')
const responseTime = require('response-time')
const multer = require('multer')()
const subdomain = require('express-subdomain')
const cors = require('cors')

const config = require('./config/conf.js')
const app = {
  domain: express(),
  subdomain: {
    image: express.Router(),
    audio: express.Router(),
    video: express.Router(),
    static: express.Router()
  }
}

<<<<<<< HEAD
app.domain.use(cors())
app.domain.use(responseTime())
app.domain.use(logger(config.logFormat))
=======
app.domain.use(responseTime())
app.domain.use(logger(config.logFormat))
app.domain.use(cors())
>>>>>>> test-headers-to-transfer-info
app.domain.use(subdomain('image', app.subdomain.image))
app.domain.use(subdomain('audio', app.subdomain.audio))
app.domain.use(subdomain('video', app.subdomain.video))
app.domain.use(subdomain('static', app.subdomain.static))

require('./routes/routes.js')(config, multer, app)

app.domain.listen(config.port, () => console.log('\'TheShed.red\' online'))