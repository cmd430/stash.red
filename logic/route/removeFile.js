const fs = require('fs')
const path = require('path')

module.exports = (config, app, common, route) => {

  // Delete single Uploaded File
  return async function removeFile (req, res) {
    let user = await common.auth(req, res)
    if (user !== false) {
      let fileID = req.params.id
      return common.queryDB('file', fileID, (err, data) => {
        if (err) {
          return common.error(res, err.status)
        }
        data = data[0]
        if (data.meta.uploaded.by !== user.username && user.username !== 'admin') {
          return common.error(res, 401)
        }
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
      })
    } else {
      return common.error(res, 401)
    }
  }

}