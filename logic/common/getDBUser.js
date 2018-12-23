module.exports = (config, app, common) => {

  return async function getDBUser (id, options, callback) {
    if (options instanceof Function) {
      callback = options
      options = {}
    }
    options = {
      showPrivate: options.showPrivate ? true : false,
      searchByUploader: true,
      withThumbnail: true,
      withFiles: false
    }
    let albums = await common.getDBAlbum(id, options, async (err, a_data) => {
      if (err) {
        return callback(err)
      }
      return a_data
    })
    let files = await common.getDBFile(id, options, async (err, f_data) => {
      if (err) {
        return callback(err)
      }
      return f_data
    })
    let user = [{
      meta: {
        username: id,
        type: 'user'
      },
      albums: albums,
      files: files,
      path: `/u/${id}`
    }]
    if (albums.concat(files).length === 0) {
      return callback(null, [])
    }
    return callback(null, user)
  }

}