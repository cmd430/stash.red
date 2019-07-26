
module.exports = (config, app, common, route) => {

  return async function events (req, res, next) {
    let user = await common.isAuthenticated(req)
    if (user) {
      req.socket.setKeepAlive(true)
      req.socket.setNoDelay(true)
      req.socket.setTimeout(0)
      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Connection', 'keep-alive')
      res.status(200)

      // IE compat
      res.write(`:${Array(2049).join(' ')}\n`)
      res.write('retry: 2000\n\n')

      let keepAlive = setInterval(function() {
        res.write(':keep-alive\n\n');
      }, 20000)
      let sendMessage = data => {
        res.write(`data: ${JSON.stringify(data)}\n\n`)
      }
      app.console.event.on('message', sendMessage)

      req.on('close', () => {
        app.console.event.removeListener('message', sendMessage)
        clearInterval(keepAlive)
      })
    } else {
      return common.error(res, 401)
    }
  }

}