const path = require('path')

module.exports = (config, app, common, route) => {

  // Download a single file or Album
  return async function download (req, res, next) {
    let type = req.params.type
    let id = req.params.download
    if (type === 'image' || type === 'audio' || type ==='video') {
      let file = path.join(config.storage[type], id)
      return common.fileExists(res, file, () => {
        return res.download(`${file}`)
      })
    } else if (type === 'album') {
      common.getDBAlbum(id, {
        showPrivate: true
      }, async (err, data) => {
        if (err) {
          return common.error(res, 500)
        } else {
          if (data.length > 0) {
            let files = []
            await common.asyncForEach(data[0].files, async file => {
              let type = file.meta.type
              files.push({
                path: path.join(config.storage[type], file.meta.filename),
                name: file.meta.filename
              })
            })
            if (files.length > 0) {
              return res.zip({
                files: files,
                filename: `${id}.zip`
              })
            } else {
              return common.error(res, 404)
            }
          } else {
            return common.error(res, 404)
          }
        }
      })
    }
  }

}