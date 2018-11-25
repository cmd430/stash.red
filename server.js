const spawn = require('child_process').spawn
const express = require('express')
const logger = require('morgan')
const responseTime = require('response-time')
const subdomain = require('express-subdomain')
const cors = require('cors')
const mongoose = require('mongoose')
const mkdir = require('make-dir')
const config = require('./config.js')
const app = {
  domain: express(),
  subdomain: {
    image: express.Router(),
    audio: express.Router(),
    video: express.Router(),
    static: express.Router()
  },
  db: mongoose,
  console: {
    // Console functions with extra formatting
    log: function (message) {
      return console.log(`[${new Date().toUTCString()}][${config.server.name}] ${message}`)
    },
    error: function (error) {
      return console.error(`[${new Date().toUTCString()}][${config.server.name}] ${error.message}`)
    }
  }
}
const multer = require('multer')({
  storage: require('./storage.js')(config, app),
  limits: {
    fileSize: config.upload.maxsize
  }
})

Promise.all(Object.keys(config.storage).map(key => {
  // Create any missing directories
  return mkdir(config.storage[key])
}))
.then(() => {
  // Start mongod
  return new Promise((resolve, reject) => {
    let mongo = spawn('mongod', [
      `--dbpath=${config.storage.database}`
    ])
    mongo.stdout.on('data', data => {
      return resolve()
    })
    mongo.on('error', err => {
      return reject(new Error('Could not start MongoDB'))
    })
  })
})
.then(() => {
  // Connect to mongo
  let mongoConnection = `${config.mongo.host}:${config.mongo.port}`
  if (config.mongo.auth.enabled) {
    mongoConnection = `${config.mongo.user}:${config.mongo.pass}@${config.mongo.host}:${config.mongo.port}`
  }
  return app.db.connect(`mongodb://${mongoConnection}/${config.mongo.db}`, config.mongo.options)
})
.then(() => {
  // Start HTTP server
  app.domain.use(responseTime())
  app.domain.use(logger(config.log))
  app.domain.use(cors())
  app.domain.use(subdomain('image', app.subdomain.image))
  app.domain.use(subdomain('audio', app.subdomain.audio))
  app.domain.use(subdomain('video', app.subdomain.video))
  app.domain.use(subdomain('static', app.subdomain.static))

  require('./routes/routes.js')(config, multer, app)

  return new Promise ((resolve, reject) => {
    app.domain.listen(config.server.port)
    .on('listening', () => {
      return resolve()
    })
    .on('error', err => {
      return reject(new Error('Could not start Express'))
    })
 })
})
.then(() => {
  // Server is now running
  app.console.log(`Server started`)
})
.catch(err => {
  // Something went wrong
  app.console.error(err)
  process.exit(1)
})