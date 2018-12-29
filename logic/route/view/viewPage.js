module.exports = (config, app, common, route) => {

  // View File / View Album / User Page | View File / View Album / User JSON
  return async function viewPage (req, res, next) {
    let type = req.params.type
    let dynamic = {
      server: config.render,
      signedin: await common.isAuthenticated(req)
    }
    if (!dynamic['server']['opengraph']['icon'].includes(`${req.protocol}://${req.hostname}`)) {
      dynamic['server']['opengraph']['icon'] =`${req.protocol}://${req.hostname}${config.render.opengraph.icon}`
    }
    dynamic['server']['opengraph']['url'] = `${req.protocol}://${req.hostname}${req.url}`
    if (type === undefined) {
      if (req.url === '/login') {
        return res.render('login.hbs', dynamic)
      } else if (req.url === '/signup') {
        return res.render('signup.hbs', dynamic)
      } else if (req.subdomains.includes(app.subdomain.download.name)) {
        return next()
      }
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
          // We show private here because we
          // used a direct file link
          return common.getDBFile(id, {
            showPrivate: true,
            showArtwork: true
          }, render)
        case 'a': // Album
          // We show private here because we
          // used a direct album link
          return common.getDBAlbum(id, {
            showPrivate: true,
            showArtwork: true
          }, render)
        case 'u': // User
          if (dynamic.signedin) {
            if (dynamic.signedin.username === id) {
              // We show private here because we
              // are logged in as the user we are
              // trying to see
              return common.getDBUser(id, {
                showPrivate: true
              }, render)
            }
          }
          // We dont show private here because
          // we are just viewing another uses
          // uploads
          return common.getDBUser(id, {
            showPrivate: false
          }, render)
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