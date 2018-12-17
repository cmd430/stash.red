module.exports = (config, app, common) => {

  return async function getDBAlbum (id, callback, searchByUploader = false) {
    return common.queryDB('album', id, async (err, result) => {
      if (err) {
        console.log(err)
        return callback(err)
      }
      await common.asyncForEach(result, async album => {
        await common.getDBFile(album.id, async (err, f_result) => {
          if (err) {
            console.log(err)
            return callback(err)
          }
          album.files = f_result
          album.meta.thumbnail = album.files[0].meta.thumbnail
        }, false, true)
      })

      return callback(null, result)
    }, searchByUploader)
  }

}