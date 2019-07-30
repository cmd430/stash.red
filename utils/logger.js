import morgan, { token } from 'morgan'
import chalk from 'chalk'

// setup morgan tokens
token('server-name', (req, res) => config.server.name)
token('id', (req, res) => chalk.magentaBright(req.id))
token('url', (req, res) => chalk.greenBright(req.url))
token('status', (req, res) => {
  if (!res.headersSent) return ' - '
  let status = res.statusCode
  if (status >= 500) return chalk.bold.red(status)
  if (status >= 400) return chalk.bold.yellow(status)
  if (status >= 300) return chalk.bold.cyan(status)
  if (status >= 200) return chalk.bold.green(status)
  if (status >= 100) return chalk.bold.grey(status)
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
      write: msg => print({
        logLevel: 1
      }, msg)
    }
  })
}

function print (opts, args) {
  let msg = ''
  if (opts.color) {
    let colored = []
    Array.prototype.slice.call(args).forEach(arg => {
      if (typeof arg === 'object') return colored.push(chalk.keyword(arg[1].color)(arg[0]))
      if (typeof arg === 'string') return colored.push(chalk.keyword(opts.color)(arg))
    })
    msg = `${colored.join(' ')}\n`
  } else {
    msg = args
  }
  if (opts.logLevel <= config.log.level && msg.length > 0) {
    if (opts.logLevel <= 3) return process.stdout.write(msg)
    if (opts.logLevel === 4) return process.stderr.write(msg)
  }
}

function info () {
  print({
    color: 'cyan',
    logLevel: 1 // info
  }, arguments)
}
function warn () {
  print({
    color: 'yellow',
    logLevel: 2 // warn
  }, arguments)
}
function debug () {
  print({
    color: 'orchid',
    logLevel: 3 // debug
  }, arguments)
}
function error () {
  print({
    color: 'red',
    logLevel: 4 // error
  }, arguments)
}

export { info, warn, debug, error, expressLogging }
