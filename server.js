const express = require('express')
const logger = require('morgan')
const responseTime = require('response-time')
const multer = require('multer')()

const app = express()
const config = require('./conf/conf.js')

app.use(responseTime())
app.use(logger('dev')) // 'default', 'short', 'tiny', 'dev'

require('./routes.js')(config, multer, app)

app.listen(config.port, () => console.log('\'TheShed.red\' online'))