module.exports = (config, app, common, route) => {

  // Update DB info for Album
  return async function updateAlbum (req, res) {
    let user = await auth(req, res)
    if (user !== false) {
      let albumID = req.params.id
      return common.queryDB('album', albumID, async (err, data) => {
        if (err) {
          return common.error(res, err.status)
        }
        data = data[0]
        if (data.meta.uploaded.by !== user.username && user.username !== 'admin') {
          return common.error(res, 401)
        }
        app.db.models.album.findOneAndUpdate({
          id: albumID
        }, {
          'meta.title': req.headers['title'] || null
        }, (err, result) => {
          if (err) {
            return common.error(res, 500)
          }
          return res.sendStatus(200)
        })
      })
    } else {
      return common.error(res, 401)
    }
  }

}