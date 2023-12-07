import { Writable } from 'node:stream'
import { Log, bold, red, yellow, cyan, green, grey } from 'cmd430-utils'

const fastifyLog = new Log('Fastify')

export default {
  level: 'debug',
  serializers: {
    res (reply) {
      return {
        statusCode: reply.statusCode,
        contentLength: reply[
          Object.getOwnPropertySymbols(reply).find(s => s.description === 'fastify.reply.headers')
        ]?.['content-length'],
        contentRange: reply[
          Object.getOwnPropertySymbols(reply).find(s => s.description === 'fastify.reply.headers')
        ]?.['content-range']
      }
    },
    req (request) {
      return {
        method: request.method,
        url: request.url,
        path: request.path,
        parameters: request.parameters
      }
    }
  },
  stream: new Writable({
    write (chunk, enc, cb) {
      const logData = JSON.parse(chunk)
      const logLevels = {
        60: 'error',
        50: 'error',
        40: 'warn',
        30: 'info',
        20: 'debug',
        10: 'debug'
      }
      const status = s => {
        if (s === '?') return s
        if (s >= 500) return red(s)
        if (s >= 400) return yellow(s)
        if (s >= 300) return cyan(s)
        if (s >= 200) return green(s)
        if (s >= 100) return grey(s)
      }
      const contentLength = cl => {
        try {
          const { offset, count, size } = cl.match(/^(?<unit>bytes) (?<offset>\d{0,})-(?<count>\d{0,})\/(?<size>\d{0,})$/)?.groups ?? {}

          if (offset || count || size) cl = count
        } catch {}

        if (cl === '?') return '?? Bytes' // should only be for streamed responses
        if (cl === '0' || cl === 0 || cl === '') return '0 Bytes'

        const i = Math.floor(Math.log(cl) / Math.log(1024))
        return `${parseFloat((cl / (1024 ** i)).toFixed((i === 0 ? 0 : 2)))} ${[ 'Bytes', 'KB', 'MB', 'GB' ][i]}`
      }

      let message = logData.msg

      if (logData.res && !logData.req) {
        message = `${logData.reqId} - ${bold(status(logData.res.statusCode ?? '?'))} - ${contentLength(logData.res.contentLength ?? logData.res.contentRange ?? '?')} - ${logData.responseTime?.toFixed(4) ?? 0 ?? '?'}ms`
      }
      if (logData.req && !logData.res) {
        message = `${logData.reqId} - ${bold(grey(logData.req.method))} - ${logData.req.url}${logData.req.path ?? ''}${logData.req.parameters ?? ''}`
      }
      if (logData.err) {
        message = `${logData.reqId} - ${logData.err?.stack}`
      }

      fastifyLog[logLevels[logData.level]](message)
      cb()
    }
  })
}
