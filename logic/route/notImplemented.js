module.exports = (config, app, common, route) => {

  // Not Implemented methods
  return async function notImplemented (req, res, next) {
    return common.error(res, 501)
  }

}