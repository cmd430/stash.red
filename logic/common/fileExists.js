const fs = require('fs')

module.exports = (config, app, common) => {

  return function fileExists (res, filepath, callback) {
    return fs.access(`${filepath}`, fs.constants.R_OK, err => {
      if (err) {
        return common.error(res, 404)
      } else {
        callback()
      }
    })
  }

}