const fs = require('fs')
const path = require('path')
const spawn = require('child_process').spawn
const eventEmitter = require('events')
const express = require('express')
const logger = require('morgan')
const responseTime = require('response-time')
const chalk = require('chalk')
const stripAnsi = require('strip-ansi')
const bodyParser = require('body-parser')
const subdomain = require('express-subdomain')
const cors = require('cors')
const busboy = require('connect-busboy')
const zip = require('express-easy-zip')
const hbs = require('hbs')
const paginate = require('handlebars-paginate')
const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')
const mkdir = require('make-dir')
const session = require('express-session')
const expressCaptcha = require('express-svg-captcha')
const mongoStore = require('connect-mongo')(session)
const config = require('./config.js')

// Allow override config opts from args
const args = process.argv.splice(process.execArgv.length + 2)
if (args.includes('--debug')) {
  config.server.logging.debug = true
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
  dbPlugins: {
    paginate: mongoosePaginate
  },
  captcha: new expressCaptcha(config.auth.captcha),
  console: {
    // Console functions with extra formatting
    log: function (message, color = 'cyan') {
      this.event.emit('message', {
        type: 'log',
        message: [
          {
            color: 'white',
            text: `[${new Date().toUTCString()}][${app.domain.name}]`
          },
          {
            color: `${color}`,
            text: `${message}`
          }
        ]
      })
      return console.log(`[${new Date().toUTCString()}][${app.domain.name}] ${chalk.keyword(color)(message)}`)
    },
    debug: function (message, color = 'deeppink') {
      if (config.server.logging.debug) {
        this.event.emit('message', {
          type: 'debug',
          message: [
            {
              color: 'white',
              text: `[${new Date().toUTCString()}][${app.domain.name}] `
            },
            {
              color: `${color}`,
              text: `${message}`
            }
          ]
        })
        return console.debug(`[${new Date().toUTCString()}][${app.domain.name}] ${chalk.keyword(color)(message)}`)
      }
    },
    warn: function (warn, stack = false) {
      if (config.server.logging.debug) {
        this.event.emit('message', {
          type: 'warn',
          message: [
            {
              color: 'white',
              text: `[${new Date().toUTCString()}][${app.domain.name}] `
            },
            {
              color: 'yellow',
              text: `${(stack ? warn.stack : warn.message)}`
            }
          ]
        })
        return console.error(`[${new Date().toUTCString()}][${app.domain.name}] ${chalk.yellow((stack ? warn.stack : warn.message))}`)
      }
    },
    error: function (error, stack = false) {
      if (config.server.logging.debug) {
        this.event.emit('message', {
          type: 'error',
          message: [
            {
              color: 'white',
              text: `[${new Date().toUTCString()}][${app.domain.name}] `
            },
            {
              color: 'lightred',
              text: `${(stack ? error.stack : error.message)}`
            }
          ]
        })
        return console.error(`[${new Date().toUTCString()}][${app.domain.name}] ${chalk.red((stack ? error.stack : error.message))}`)
      }
    },
    event: new eventEmitter()
  }
}
chalk.enabled = config.server.logging.colors
process.on('warning', warning => {
  if (config.server.logging.debug) {
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
.then(async () => {
  await new Promise((resolve, reject) => {
    fs.readdir(config.storage.temp, async (err, files) => {
      if (!err) {
        if (files.length > 0) {
          let removed = 0
          app.console.debug(`Found ${files.length} temp files`)
          for (let index = 0; index < files.length; index++) {
            await new Promise((resolve, reject) => {
              fs.unlink(path.join(config.storage.temp, files[index]), err => {
                if (!err) {
                  removed += 1
                }
                resolve()
              })
            })
          }
          app.console.debug(`Removed ${removed} temp files`)
        }
      }
      resolve()
    })
  })
})
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
    mongo.on('exit', (code, signal) => {
      if (code === 48 || code === 100) {
        app.console.debug(`An instance of mongod is already running`)
        app.console.debug(`Attempting unmanaged connection`)
        return resolve(code)
      } else {
        app.console.debug(`mongod has exited ${code || signal}`)
      }
    })
  })
})
.then(code => {
  if (code === undefined) {
    app.console.debug('Started mongod')
  }
  // Connect to mongo
  let hasConnected = false
  let mongoConnection = `${config.mongo.host}:${config.mongo.port}`
  if (config.mongo.auth.enabled) {
    mongoConnection = `${config.mongo.user}:${config.mongo.pass}@${config.mongo.host}:${config.mongo.port}`
  }
  app.console.debug('Connecting to mongodb')
  app.db.connection.on('error', () => {
    app.console.debug(`Could not connect to MongoDB`)
  })
  app.db.connection.on('disconnected', () => {
    app.console.debug(`Lost connection to MongoDB`)
  })
  app.db.connection.on('connected', () => {
    if (!hasConnected) {
      app.console.debug('Connection established to MongoDB')
      hasConnected = true
    }
  })
  app.db.connection.on('reconnected', () => {
    app.console.debug(`Connection to MongoDB re-established`)
  })
  return app.db.connect(`mongodb://${mongoConnection}/${config.mongo.db}`, config.mongo.options)
})
.then(() => {
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
  hbs.registerHelper('if_eq', (a, b, context, opts) => {
    if (context instanceof Function) {
      opts = context
    } else if (!context instanceof Object) {
      context = this
    }
    if (a === b) {
      return opts.fn(context)
    } else {
      return opts.inverse(context)
    }
  })
  hbs.registerHelper('paginate', paginate)
  hbs.registerPartials(`${config.handelbars.partials}`)

  logger.token('status', (req, res) => {
    let status = (typeof res.headersSent !== `boolean` ? Boolean(res._header) : res.headersSent) ? res.statusCode : 499 // '-'
    if (config.server.logging.colors) {
      let statusColor = status >= 500 ? 'red' : status >= 400 ? 'yellow' : status >= 300 ? 'cyan' : status >= 200 ? 'green' : 'reset'
      if (statusColor !== 'reset') {
        return chalk.keyword(statusColor)(status)
      } else {
        return status
      }
    } else {
      return status
    }
  })
  logger.token('content', function (req, res, format) {
    if (typeof res.headersSent !== 'boolean' ? Boolean(res._header) : res.headersSent) {
      let content_length = res.getHeader('content-length') || '-'
      if (content_length !== '-') {
        switch (format || 'bytes') {
          case 'bytes':
            return `${content_length} ${format}`
          case 'kb':
            return `${(content_length / 1024).toFixed(2)} ${format}`
          case 'mb':
            return `${(content_length / 1024 / 1024).toFixed(2)} ${format}`
          case 'gb':
            return `${(content_length / 1024 / 1024 / 1024).toFixed(2)} ${format}`
          case 'auto':
            const i = Math.floor(Math.log(content_length) / Math.log(1024))
            return `${parseFloat((content_length / Math.pow(1024, i)).toFixed((i === 0 ? 0 : 2)))} ${['bytes', 'kb', 'mb', 'gb'][i]}`
        }
      } else {
        return content_length
      }
    }
  })
  logger.token('server-name', (req, res) => {
    return config.server.name
  })

  app.domain.router.enable('trust proxy')
  app.domain.router.set('view engine', 'hbs')
  app.domain.router.set('views', `${config.handelbars.views}`)
  app.domain.router.use(session({
    secret: config.auth.session.secret,
    resave: false,
    saveUninitialized: true,
    cookie: config.auth.session.cookie,
    store: new mongoStore({
      mongooseConnection: app.db.connection
    })
  }))
  app.domain.router.use(bodyParser.json())
  app.domain.router.use(bodyParser.urlencoded({
    extended: false
  }))
  app.domain.router.use(responseTime())
  if (config.server.logging.express.incomming.enabled) {
    app.domain.router.use(logger(config.server.logging.express.incomming.format, {
      immediate: true
    }))
    app.domain.router.use(logger(config.server.logging.express.incomming.format, {
      immediate: true,
      stream: {
        write: log => {
          log = stripAnsi(log)
          app.console.event.emit('message', {
            type: 'log',
            message: [
              {
                color: 'white',
                text: `${log}`
              }
            ]
          })
        }
      }
    }))
  }
  if (config.server.logging.express.outgoing.enabled) {
    app.domain.router.use(logger(config.server.logging.express.outgoing.format, {
      immediate: false
    }))
    app.domain.router.use(logger(config.server.logging.express.outgoing.format, {
      immediate: false,
      stream: {
        write: log => {
          log = stripAnsi(log)
          let status = log.match(/\s\d\d\d\s/) ? log.match(/\s\d\d\d\s/)[0] : ' - '
          let statusColor = status >= 500 ? 'lightred' : status >= 400 ? 'yellow' : status >= 300 ? 'cyan' : status >= 200 ? 'lightgreen' : 'white'
          log = log.split(status)
          app.console.event.emit('message', {
            type: 'log',
            message: [
              {
                color: 'white',
                text: `${log[0]}`
              },
              {
                color: `${statusColor}`,
                text: `${status}`
              },
              {
                color: 'white',
                text: `${log[1]}`
              }
            ]
          })
        }
      }
    }))
  }
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
  app.domain.router.use(zip())
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