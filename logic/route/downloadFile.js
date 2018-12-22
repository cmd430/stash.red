const path = require('path')

module.exports = (config, app, common, route) => {

  // Download a single file
  return async function downloadFile (req, res, next) {
    let type = req.params.type
    if (type === 'image' || type === 'audio' || type ==='video') {
      let file = path.join(config.storage[type], req.params.file)
      return common.fileExists(res, file, () => {
        return res.download(`${file}`)
      })
    }
  }

}