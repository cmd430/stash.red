import morgan, { token } from 'morgan'
import chalk from 'chalk'

// setup morgan tokens
token('server-name', (req, res) => config.server.name)
token('id', (req, res) => chalk.magentaBright(req.id))
token('url', (req, res) => chalk.greenBright(req.url))
token('status', (req, res) => {
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
    }
  }
  return ' - '
})
token('content-length', (req, res, format) => {
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
  return morgan(config.log.format, {
    stream: {
      write: msg => log({
        logLevel: 1
      }, msg)
    }
  })
}

function log (opts, args) {
  let msg = ''
  if (opts.color) {
    let colored = []
    Array.prototype.slice.call(args).forEach(arg => {
      if (typeof arg === 'object') {
        colored.push(chalk.keyword(arg[1].color)(arg[0]))
      } else {
        colored.push(chalk.keyword(opts.color)(arg))
      }
    })
    msg = `${colored.join(' ')}\n`
  } else {
    msg = args
  }
  if (opts.logLevel <= config.log.level) {
    process.stdout.write(msg)
  }
}

function info () {
  log({
    color: 'cyan',
    logLevel: 1 // info
  }, arguments)
}
function warn () {
  log({
    color: 'yellow',
    logLevel: 2 // warn
  }, arguments)
}
function debug () {
  log({
    color: 'orchid',
    logLevel: 3 // debug
  }, arguments)
}
function error () {
  log({
    color: 'red',
    logLevel: 4 // error
  }, arguments)
}

export { info, warn, debug, error, expressLogging }
