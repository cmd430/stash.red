import { Log } from 'cmd430-utils'

// eslint-disable-next-line no-unused-vars
const { log, debug, info, warn, error } = new Log('Error Handler')

export default function errorHandler (err, request, reply) {
  if (!err.status && err.statusCode) err.status = err.statusCode
  if (!err.status) {
    err.status = 500
    err.message = 'Internal Server Error'
    error(err.stack)
  }

  // Message Overrides
  const errorMessages = {
    '404': 'Not Found',
    '416': 'Invalid Range'
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

  reply
    .code(err.status)
    .view('error', {
      status: err.status,
      message: errorMessages[err.status] ?? err.message,
      description: errorDescriptions[err.status] ?? err.description ?? 'An unknown error has occurred',
      stack: err.stack
    })
}
