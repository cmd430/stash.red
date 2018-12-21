module.exports = (config, app, common) => {

  return async function getDBAlbum (id, options, callback) {
    if (options instanceof Function) {
      callback = options
      options = {}
    }
    options = {
      searchByUploader: options.searchByUploader || false,
      showPrivate: options.showPrivate || false
    }
    let fileOptions = {
      filesInAlbum: true,
      showPrivate: options.showPrivate
    }
    return common.queryDB('album', id, options, async (err, result) => {
      if (err) {
        return callback(err)
      }
      await common.asyncForEach(result, async album => {
        await common.getDBFile(album.id, fileOptions, async (err, f_result) => {
          if (err) {
            return callback(err)
          }
          album.files = f_result
          album.meta.thumbnail = album.files[0].meta.thumbnail
        })
      })

      return callback(null, result)
    })
  }

}