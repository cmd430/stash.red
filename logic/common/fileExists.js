const fs = require('fs')

module.exports = (config, app, common) => {

  return function fileExists (res, filepath, callback) {
    return fs.stat(`${filepath}`, (err, stats) => {
      if (err || stats.isDirectory()) {
        return common.error(res, 404)
      } else {
        return callback()
      }
    })
  }

}