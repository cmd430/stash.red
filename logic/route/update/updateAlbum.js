module.exports = (config, app, common, route) => {

  // Update DB info for Album
  return async function updateAlbum (req, res) {
    let user = await common.isAuthenticated(req)
    if (user) {
      if (req.body.title || req.body.public) {
        let albumID = req.params.id
        return new common.queryDB({
          showPrivate: true
        }).getAlbum(albumID, {
          albumMetaOnly: true
        }, async (err, data) => {
          if (err) {
            return common.error(res, err.status)
          }
          data = data[0]
          if (data.meta.uploaded.by !== user.username && user.isAdmin === false) {
            return common.error(res, 401)
          }
          let update = {}
          if (req.body.title) {
            let title = req.body.title.trim()
            if (!title.replace(/\s/g, '').length) {
              title = 'Album'
            }
            update['meta.title'] = title
          }
          if (req.body.public) {
            update['meta.public'] = req.body.public
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