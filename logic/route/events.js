
module.exports = (config, app, common, route) => {

  return async function events (req, res, next) {
    let user = await common.isAuthenticated(req)
    if (user) {
      req.socket.setKeepAlive(true)
      req.socket.setTimeout(0)
      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Connection', 'keep-alive')
      res.status(200)
      app.console.event.on('message', data => {
        res.write("data: " + JSON.stringify(data) + "\n\n")
      })
    } else {
      return common.error(res, 401)
    }
  }

}