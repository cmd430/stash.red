const spawn = require('child_process').spawn
const express = require('express')
const logger = require('morgan')
const responseTime = require('response-time')
const chalk = require('chalk')
const bodyParser = require('body-parser')
const subdomain = require('express-subdomain')
const cors = require('cors')
const busboy = require('connect-busboy')
const hbs = require('hbs')
const mongoose = require('mongoose')
const mkdir = require('make-dir')
const session = require('express-session')
const captcha = require('svg-captcha-express').create({
  cookie: 'captcha',
  background: 'rgba(0, 0, 0, 0)',
  fontSize: 40,
  width: 100,
  height: 40,
  charPreset: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()?',
  size: 4,
  noise: 0,
  color: true
})
const mongoStore = require('connect-mongo')(session)
const config = require('./config.js')

// Allow override config opts from args
const args = process.argv.splice(process.execArgv.length + 2)
if (args.includes('--debug')) {
  config.server.debug = true
}

const app = {
  domain: {
    name: config.server.name,
    router: express()
  },
  subdomain: {
    image: {
      name: config.server.subdomains.image,
      router: express.Router()
    },
    audio: {
      name: config.server.subdomains.audio,
      router: express.Router()
    },
    video: {
      name: config.server.subdomains.video,
      router: express.Router()
    },
    download: {
      name: config.server.subdomains.download,
      router: express.Router()
    }
  },
  db: mongoose,
  captcha: captcha,
  console: {
    // Console functions with extra formatting
    log: function (message, color = 'cyan') {
      return console.log( `[${new Date().toUTCString()}][${app.domain.name}] ${chalk.keyword(color)(message)}`)
    },
    debug: function (message, color = 'deeppink') {
      if (config.server.debug) {
        return console.debug(`[${new Date().toUTCString()}][${app.domain.name}] ${chalk.keyword(color)(message)}`)
      }
    },
    warn: function (warn, stack = false) {
      return console.error(`[${new Date().toUTCString()}][${app.domain.name}] ${chalk.yellow((stack ? warn.stack : warn.message))}`)
    },
    error: function (error, stack = false) {
      return console.error(`[${new Date().toUTCString()}][${app.domain.name}] ${chalk.red((stack ? error.stack : error.message))}`)
    }
  }
}
chalk.enabled = config.server.colors
process.on('warning', warning => {
  if (config.server.debug) {
    // Only show warnings when debuging
    app.console.warn(warning)
  }
})
// Catch any unhandled errors
// and add timestamp to output
// before killing application
process.on('uncaughtException', error => {
  app.console.error(error, true)
  process.exit(1)
})
process.on('unhandledRejection', error => {
  if (error instanceof Error) {
    app.console.error(error, true)
  } else {
    app.console.error({
      message: error
    })
  }
  process.exit(1)
})
app.console.log(`Server starting`, 'cyan')
app.console.debug('Debug enabled') // Only logs if Debug is infact enabled
const startTime = process.hrtime()
// Main Startup chain
Promise.all(Object.keys(config.storage).map(key => {
  // Create any missing directories
  return mkdir(config.storage[key])
}))
.then(() => {
  // Start mongod
  app.console.debug('Starting mongod')
  return new Promise((resolve, reject) => {
    let mongo = spawn('mongod', [
      `--dbpath=${config.storage.database}`
    ])
    mongo.stdout.on('data', data => {
      if (data.toString().includes('waiting for connections')) {
        return resolve()
      }
    })
    mongo.on('error', err => {
      return reject(new Error(`Could not start MongoDB: ${err.message}`))
    })
  })
})
.then(() => {
  app.console.debug('Started mongod')
  // Connect to mongo
  let mongoConnection = `${config.mongo.host}:${config.mongo.port}`
  if (config.mongo.auth.enabled) {
    mongoConnection = `${config.mongo.user}:${config.mongo.pass}@${config.mongo.host}:${config.mongo.port}`
  }
  app.console.debug('Connecting to mongodb')
  return app.db.connect(`mongodb://${mongoConnection}/${config.mongo.db}`, config.mongo.options)
})
.then(() => {
  app.console.debug('Connected to mongodb')
  // Start HTTP server
  hbs.registerHelper('json', data => {
    return JSON.stringify(data)
  })
  hbs.registerHelper('typeof', file => {
    let type = file.meta.type
    return `${type.charAt(0).toUpperCase()}${type.slice(1)}`
  })
  hbs.registerHelper('is', (left_value, right_value, options) => {
    if (left_value.meta.type === right_value) {
        return options.fn(left_value)
    } else {
        return options.inverse(this)
    }
  })
  hbs.registerPartials(`${config.handelbars.partials}`)

  app.domain.router.enable('trust proxy')
  app.domain.router.set('view engine', 'hbs')
  app.domain.router.set('views', `${config.handelbars.views}`)
  app.domain.router.use(session({
    secret: 'work hard',
    resave: true,
    saveUninitialized: false,
    cookie: {
      secure: 'auto',
      maxAge: 2592000000 // 30 days from now
    },
    store: new mongoStore({
      mongooseConnection: app.db.connection
    })
  }))
  app.domain.router.use(bodyParser.json())
  app.domain.router.use(bodyParser.urlencoded({
    extended: false
  }))
  app.domain.router.use(responseTime())
  app.domain.router.use(logger(config.log))
  app.domain.router.use(cors({
    exposedHeaders: [
      'Content-Length'
    ]
  }))
  app.domain.router.use(busboy({
    highWaterMark: config.upload.buffer,
    limits: {
      fileSize: config.upload.maxsize
    }
  }))

  app.domain.router.use(subdomain(`${app.subdomain.image.name}`, app.subdomain.image.router))
  app.domain.router.use(subdomain(`${app.subdomain.audio.name}`, app.subdomain.audio.router))
  app.domain.router.use(subdomain(`${app.subdomain.video.name}`, app.subdomain.video.router))
  app.domain.router.use(subdomain(`${app.subdomain.download.name}`, app.subdomain.download.router))

  require('./models/models.js')(config, app)
  require('./routes.js')(config, app)

  app.console.debug('Starting Express')
  return new Promise ((resolve, reject) => {
    app.domain.router.listen(config.server.port)
    .on('listening', () => {
      return resolve()
    })
    .on('error', err => {
      return reject(new Error(`Could not start Express: ${err.message}`))
    })
  })
})
.then(() => {
  // Server is now running
  let diff = process.hrtime(startTime)
  let milliseconds = (diff[0] * 1e9 + diff[1]) / 1000000
  let seconds = ((milliseconds % 60000) / 1000).toFixed(1)
  app.console.log(`Server started in ${(seconds >= 1 ? `${seconds}s` : `${milliseconds.toFixed(1)}ms`)}`, 'green')
})
.catch(err => {
  // Something went wrong
  app.console.error(err)
  process.exit(1)
})