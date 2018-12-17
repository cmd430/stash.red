module.exports = (config, app, common) => {

  return async function getDBFile (id, callback, searchByUploader = false, filesInAlbum = false) {
    return common.queryDB('file', id, callback, searchByUploader, filesInAlbum)
  }

}