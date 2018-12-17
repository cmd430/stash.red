module.exports = (config, app, common) => {

  return async function getDBUser (id, callback) {
    let albums = await common.getDBAlbum(id, async (err, a_data) => {
      if (err) {
        return callback(err)
      }
      return a_data
    }, true)
    let files = await common.getDBFile(id, async (err, f_data) => {
      if (err) {
        return callback(err)
      }
      return f_data
    }, true, false)
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