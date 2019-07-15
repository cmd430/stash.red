module.exports = (config, app, common, route) => {

  // Update DB info for Album
  return async function updateAlbum (req, res) {
    let user = await common.isAuthenticated(req)
    if (user) {
      app.console.debug(req.body.title)
      app.console.debug(req.body.public)
      if (req.body.title && req.body.public) {
        let albumID = req.params.id
        return common.queryDB('album', albumID, {
          showPrivate: true
        }, async (err, data) => {
          if (err) {
            return common.error(res, err.status)
          }
          data = data[0]
          if (data.meta.uploaded.by !== user.username && user.isAdmin === false) {
            return common.error(res, 401)
          }

          let update = {
            'meta.title': req.body.title,       // WIP, needs client side JS done for editing
            'meta.public': req.body.public      // values :- see notes file if you're me
          }

          app.db.models.album.findOneAndUpdate({
            id: albumID
          }, update, (err, result) => {
            if (err) {
              return common.error(res, 500)
            }
            return res.sendStatus(200)
          })
        })
      } else {
        return common.error(res, 400)
      }
    } else {
      return common.error(res, 401)
    }
  }

}