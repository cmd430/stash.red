const fs = require('fs')
const path = require('path')

module.exports = (config, app, common, route) => {

  // Delete entire Album
  return async function removeAlbum (req, res) {
    let user = await common.isAuthenticated(req)
    if (user) {
      let albumID = req.params.id
      return common.queryDB('album', albumID, async (err, data) => {
        if (err) {
          return common.error(res, err.status)
        }
        data = data[0]
        if (data.meta.uploaded.by !== user.username && user.isAdmin === false) {
          return common.error(res, 401)
        }
        await common.queryDB('file', albumID, async (err, data) => {
          if (err) {
            return common.error(res, err.status)
          }
          await common.asyncForEach(data, async file => {
            fs.unlink(path.join(config.storage[file.meta.type], file.meta.filename), err => {
              if (err) {
                return common.error(res, 500)
              }
              return app.db.models.file.findOneAndRemove({
                id: file.id
              }, err => {
                if (err) {
                  return common.error(res, 500)
                }
              })
            })
          })
        }, false, true)
        app.db.models.album.findOneAndRemove({
          id: albumID
        }, err => {
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