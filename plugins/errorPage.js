import { fastifyPlugin } from 'fastify-plugin'
import createError from 'http-errors'
import { Log, isNumber } from 'cmd430-utils'

// eslint-disable-next-line no-unused-vars
const { log, debug, info, warn, error } = new Log('Create Error')

export default fastifyPlugin(async (fastify, opts) => {
  fastify.decorateReply('error', function (err, description) {
    if (isNumber(err)) {
      err = createError(err)
      err.description = description
      // mark our errors as safe
      // if safe we will first use description/message from the error before fallingback to the overrides
      // if not safe then we will always use the overrides and fallback to the generic error messages
      err.safe = true
    }

    if (!err.status && err.statusCode) err.status = err.statusCode
    if (err.code === 'ENOENT') err.status = '404'
    if (!err.status) {
      err.status = 500
      error(err)
    }

    // Message Overrides
    const errorMessages = {
      '404': 'Not Found',
      '416': 'Invalid Range',
      '500': 'Internal Server Error'
    }

    // Error Description Overrides
    const errorDescriptions = {
      '400': 'The request cannot be fulfilled',
      '401': 'You do not have permission for this',
      '403': 'You are forbidden from this',
      '404': 'The requested page could not be found',
      '416': 'The range specified is invalid for the current size of the resource',
      '500': 'Something has gone wrong processing the request'
    }

    // eslint-disable-next-line no-invalid-this
    return this
      .status(err.status)
      .view('error', {
        status: err.status,
        message: (err.safe ? err.message ?? errorMessages[err.status] : errorMessages[err.status]) ?? 'Error',
        description: (err.safe ? err.description ?? errorDescriptions[err.status] : errorDescriptions[err.status]) ?? 'An unknown error has occurred',
        stack: err.stack
      })
  })
}, {
  fastify: '4.x',
  name: 'error-page'
})
