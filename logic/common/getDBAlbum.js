module.exports = (config, app, common) => {

  return async function getDBAlbum (id, options, callback) {
    if (options instanceof Function) {
      callback = options
      options = {}
    }
    let withFiles = true
    if (options.withFiles === false) {
      withFiles = false
    }
    options = {
      searchByUploader: options.searchByUploader ? true : false,
      showPrivate: options.showPrivate ? true : false,
      withThumbnail: options.withThumbnail ? true : false,
      withFiles: withFiles,
      showArtwork: options.showArtwork ? true : false,
    }
    let fileOptions = {
      filesInAlbum: true,
      showPrivate: options.showPrivate,
      showArtwork: options.showArtwork
    }
    return common.queryDB('album', id, options, async (err, result) => {
      if (err) {
        return callback(err)
      }
      await common.asyncForEach(result, async album => {
        if (options.withFiles) {
          await common.getDBFile(album.id, fileOptions, async (err, f_result) => {
            if (err) {
              return callback(err)
            }
            album.files = f_result
          })
        } else {
          fileOptions.withThumbnail = true
          fileOptions.maxResults = 1
          await common.getDBFile(album.id, fileOptions, async (err, f_result) => {
            if (err) {
              return callback(err)
            }
            album.meta.thumbnail = f_result[0].meta.thumbnail
          })
        }
      })
      return callback(null, result)
    })
  }

}