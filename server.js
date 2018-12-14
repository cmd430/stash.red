const spawn = require('child_process').spawn
const express = require('express')
const logger = require('morgan')
const responseTime = require('response-time')
const chalk = require('chalk')
const subdomain = require('express-subdomain')
const cors = require('cors')
const hbs = require('hbs')
const mongoose = require('mongoose')
const mkdir = require('make-dir')
const config = require('./config.js')
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
    }
  },
  db: mongoose,
  console: {
    // Console functions with extra formatting
    log: function (message, color = 'cyan') {
      return console.log( `[${new Date().toUTCString()}][${app.domain.name}] ${chalk.keyword(color)(message)}`)
    },
    debug: function (message) {
      if (config.server.debug) {
        return console.debug(`[${new Date().toUTCString()}][${app.domain.name}] ${chalk.magenta(message)}`)
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
const multer = require('multer')({
  storage: require('./storage.js')(config, app),
  limits: {
    fileSize: config.upload.maxsize
  }
})
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
  app.console.error(error, true)
  process.exit(1)
})
// Only logs if Debug is infact enabled
app.console.debug('Debug enabled')

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
      return resolve()
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
  app.domain.router.use(responseTime())
  app.domain.router.use(logger(config.log))
  app.domain.router.use(cors({
    exposedHeaders: [
      'Content-Length'
    ]
  }))
  app.domain.router.use(subdomain(`${app.subdomain.image.name}`, app.subdomain.image.router))
  app.domain.router.use(subdomain(`${app.subdomain.audio.name}`, app.subdomain.audio.router))
  app.domain.router.use(subdomain(`${app.subdomain.video.name}`, app.subdomain.video.router))

  require('./routes/routes.js')(config, multer, app)

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
  app.console.log(`Server started`, 'green')
})
.catch(err => {
  // Something went wrong
  app.console.error(err)
  process.exit(1)
})