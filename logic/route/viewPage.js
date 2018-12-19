module.exports = (config, app, common, route) => {

  // View File / View Album / User Page | View File / View Album / User JSON
  return async function viewPage (req, res, next) {
    let type = req.params.type
    let dynamic = {
      server: config.render
    }
    dynamic['server']['opengraph']['icon'] = `${req.protocol}://${req.hostname}${config.render.opengraph.icon}`
    dynamic['server']['opengraph']['url'] = `${req.protocol}://${req.hostname}${req.url}`
    if (type === undefined) {
      // Serve our Homepage
      return res.render('index.hbs', dynamic)
    } else {
      let typeLong = (type === 'f' ? 'file' : (type === 'a' ? 'album' : 'user'))
      let id = req.params.id
      let rawJSON = false
      if (req.params.id.includes('.json')) {
        id = id.split('.')[0]
        rawJSON = true
      }
      switch (type) {
        case 'f': // File
          return common.getDBFile(id, render)
        case 'a': // Album
          return common.getDBAlbum(id, render)
        case 'u': // User
          return common.getDBUser(id, render)
        default: // Error
          if (!rawJSON) {
            // We are probably trying to load an asset
            // so we return next to try the next matching
            // route that should be the asset route
            // if the file doesnt match on that route we
            // will receive the 404
            return next()
          } else {
            return common.error(res, 404)
          }
      }
      // Do the render from results
      function render (err, data) {
        if (err) {
          return common.error(res, err.status)
        } else {
          if (data.length > 0) {
            dynamic[typeLong] = common.formatResults(req, data)[0]
            if (!rawJSON) {
              return res.status(200).render(`${typeLong}.hbs`, dynamic)
            } else {
              return res.status(200).json(dynamic[typeLong])
            }
          } else {
            return common.error(res, 404)
          }
        }
      }
    }
  }

}