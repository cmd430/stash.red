const request = require('request')

module.exports = (config, app, common, route) => {

  // CORS Proxy
  /*
    The upload script could technically handle urls
    and do this to save some bandwidth but then we don't get
    proper upload% and it redirects early...
    I Might look into this later though for now we will just have
    a CORS proxy here to allow everything to work normally
  */
  return async function cors (req, res, next) {
    let origin = (req.header('Origin') ? `${req.header('Origin')}/` : null)
    let referer = (req.header('Referer') ? req.header('Referer') : null)
    let host = `${req.protocol}://${req.hostname.match(/[^\.]*\.[^.]*$/)[0]}/`
    if (origin === referer && origin === host) {
      let reqURL = req.url.slice(1)
      if (reqURL && reqURL.startsWith('http')) {
        return request({
          url: reqURL,
          method: 'GET'
        })
        .pipe(res)
      } else {
        return common.error(res, 400)
      }
    } else {
      return res.redirect(`${req.protocol}://${req.hostname.match(/[^\.]*\.[^.]*$/)[0]}/`)
    }
  }

}