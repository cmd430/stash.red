module.exports = (config, app, common) => {

  return function error (res, status, message) {
    if (typeof message === 'undefined') {
      switch (status) {
        case 400:
          message = {
            error: 'bad request'
          }
          break
        case 401:
          message = {
            error: 'unauthorized'
          }
          break
        case 404:
          message = {
            error: 'file not found'
          }
          break
        case 413:
          message = {
            error: 'payload too large'
          }
          break
        case 422:
          message = {
            error: 'unprocessable entity'
          }
          break
        case 500:
          message = {
            error: 'internal error'
          }
          break
        case 501:
          message = {
            error: 'not implemented'
          }
          break
        case 507:
          message = {
            error: 'insufficient storage'
          }
          break
      }
    }
    return res.status(status).json({
      status: status,
      error: message.message || message.error
    })
  }

}