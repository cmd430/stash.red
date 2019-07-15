const fs = require('fs')
const path = require('path')

module.exports = (config, app, common, route) => {

  // Delete single Uploaded File
  return async function removeFile (req, res) {
    let user = await common.isAuthenticated(req)
    if (user) {
      let fileID = req.params.id
      return common.queryDB('file', fileID, (err, data) => {
        if (err) {
          return common.error(res, err.status)
        }
        data = data[0]
        if (data.meta.uploaded.by !== user.username && user.isAdmin === false) {
          return common.error(res, 401)
        }
        if (data.meta.album !== undefined) {
          app.db.models.file.find({
            'meta.album': data.meta.album
          }, (err, docs) => {
            if (err) {
              return common.error(res, 500)
            }
            if (docs.length === 1) {
              // Remove album if last image
              req.params.id = data.meta.album
              return route.removeAlbum(req, res)
            } else {
              //remove image
              fs.unlink(path.join(config.storage[data.meta.type], data.meta.filename), err => {
                if (err) {
                  return common.error(res, 500)
                }
                app.db.models.file.findOneAndRemove({
                  id: fileID
                }, err => {
                  if (err) {
                    return common.error(res, 500)
                  }
                  return res.sendStatus(200)
                })
              })
            }
          })
        }
      })
    } else {
      return common.error(res, 401)
    }
  }

}