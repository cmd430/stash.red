import morgan, { token } from 'morgan'
import chalk from 'chalk'

// setup morgan tokens
token('server-name', (req, res) => chalk.grey(config.server.name))
token('id', (req, res) => chalk.grey(req.id.split('-').reverse().pop()))
token('url', (req, res) => chalk.green(req.originalUrl))
token('method', (req, res) => {
  switch (req.method) {
    case 'HEAD':
      return 'HEAD  '
    case 'GET':
      return 'GET   '
    case 'POST':
      return 'POST  '
    case 'PATCH':
      return 'PATCH '
    case 'DELETE':
      return 'DELETE'
    default:
      return '      '
  }
})
morgan.token('date', (req, res, format) => {
  let dateTime = new Date()
  switch (format || 'web') {
    case 'clf':
      return () => {
        let date = dateTime.getUTCDate()
        let hour = dateTime.getUTCHours()
        let mins = dateTime.getUTCMinutes()
        let secs = dateTime.getUTCSeconds()
        let year = dateTime.getUTCFullYear()
        let month = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][dateTime.getUTCMonth()]
        let pad2 = num => {
          let str = String(num)
          return (str.length === 1 ? '0' : '') + str
        }
        return chalk.grey(`[${pad2(date)}/${month}/${year}:${pad2(hour)}:${pad2(mins)}:${pad2(secs)} +0000]`)
      }
    case 'iso':
      return chalk.grey(`[${dateTime.toISOString()}]`)
    case 'web':
      return chalk.grey(`[${dateTime.toUTCString()}]`)
  }
})
token('status', (req, res) => {
  if (!res.headersSent) return ' - '
  let status = res.statusCode
  if (status >= 500) return chalk.bold.red(status)
  if (status >= 400) return chalk.bold.yellow(status)
  if (status >= 300) return chalk.bold.cyan(status)
  if (status >= 200) return chalk.bold.green(status)
  if (status >= 100) return chalk.bold.grey(status)
})
token('response-time', (req, res, digits) => {
  if (!req._startAt || !res._startAt) return ' '
  return `${((res._startAt[0] - req._startAt[0]) * 1e3 + (res._startAt[1] - req._startAt[1]) * 1e-6).toFixed(digits === undefined ? 3 : digits)} ms`
})
token('content-length', (req, res, format) => {
  let content_length
  if (res.headersSent) content_length = res.getHeader('content-length')
  if (!res.headersSent) content_length = req.headers['content-length']
  if (!content_length) return ' '
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
})

function expressResponseLogging () {
  return morgan(config.log.format, {
    stream: {
      write: msg => print({
        logLevel: 1
      }, msg)
    }
  })
}
function expressRequestLogging () {
  return morgan(config.log.format, {
    immediate: true,
    stream: {
      write: msg => print({
        logLevel: 3
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

export { info, warn, debug, error, expressResponseLogging, expressRequestLogging }
