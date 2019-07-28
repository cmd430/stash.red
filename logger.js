const morgan = require('morgan')
const chalk = require('chalk')

const config = {
  stash: require('./configs/stash.json5'),
  express: require('./configs/express.json5')
}
chalk.enabled = config.stash.log.color

// setup morgan tokens
morgan.token('status', (req, res) => {
  if (res.headersSent) {
    let status = res.statusCode
    if (status >= 500) {
      return chalk.bold.red(status)
    } else if (status >= 400) {
      return chalk.bold.yellow(status)
    } else if (status >= 300) {
      return chalk.bold.cyan(status)
    } else if (status >= 200) {
      return chalk.bold.green(status)
    } else if (status >= 100) {
      return chalk.bold.grey(status)
    } else {
      return ' - '
    }
  }
})
morgan.token('server-name', (req, res) => {
  return config.stash.server.name
})
morgan.token('id', (req, res) => {
  return chalk.magentaBright(req.id)
})
morgan.token('url', (req, res) => {
  return chalk.greenBright(req.url)
})
morgan.token('content-length', (req, res, format) => {
  if (res.headersSent) {
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

function expressLogging () {
  return morgan(config.express.log.format)
}
function log () {
  switch (config.stash.log.level) {
    case 'info':
    case 'debug':
      let msg = []
      Array.prototype.slice.call(arguments).forEach(arg => {
        if (typeof arg === 'object') {
          if (!arg.color) {
            msg.push(chalk.grey(arg.msg))
          } else {
            msg.push(chalk.keyword(arg.color)(arg.msg))
          }
        } else {
          msg.push(chalk.grey(arg))
        }
      })
      console.log(msg.join(' '))
      break
    case 'silent':
    default:
      return
  }
}
function info () {
  switch (config.stash.log.level) {
    case 'info':
    case 'debug':
      let msg = []
      Array.prototype.slice.call(arguments).forEach(arg => {
        if (typeof arg === 'object') {
          if (!arg.color) {
            msg.push(chalk.cyan(arg.msg))
          } else {
            msg.push(chalk.keyword(arg.color)(arg.msg))
          }
        } else {
          msg.push(chalk.cyan(arg))
        }
      })
      console.log(msg.join(' '))
      break
    case 'silent':
    default:
      return
  }
}
function debug () {
  switch (config.stash.log.level) {
    case 'debug':
      let msg = []
      Array.prototype.slice.call(arguments).forEach(arg => {
        if (typeof arg === 'object') {
          if (!arg.color) {
            msg.push(chalk.magentaBright(arg.msg))
          } else {
            msg.push(chalk.keyword(arg.color)(arg.msg))
          }
        } else {
          msg.push(chalk.magentaBright(arg))
        }
      })
      console.log(msg.join(' '))
      break
    case 'info':
    case 'warn':
    case 'error':
    case 'silent':
    default:
      return
  }
}
function warn () {
  switch (config.stash.log.level) {
    case 'debug':
    case 'warn':
    case 'error':
        Array.prototype.slice.call(arguments).forEach(arg => {
          console.warn(chalk.yellow(arg))
        })
      break
    case 'info':
    case 'debug':
    case 'silent':
    default:
      return
  }
}
function error () {
  switch (config.stash.log.level) {
    case 'debug':
    case 'error':
      Array.prototype.slice.call(arguments).forEach(arg => {
        console.error(chalk.red(arg))
      })
      break
    case 'info':
    case 'debug':
    case 'warn':
    case 'silent':
    default:
      return
  }
}

module.exports = {
  morgan: expressLogging,
  log: log,
  info: info,
  debug: debug,
  warn: warn,
  error: error,
}