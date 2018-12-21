module.exports = (config, app, common) => {

  return async function getDBFile (id, options, callback) {
    if (options instanceof Function) {
      callback = options
      options = {}
    }
    options = {
      searchByUploader: options.searchByUploader || false,
      filesInAlbum: options.filesInAlbum || false,
      showPrivate: options.showPrivate || false
    }
    return common.queryDB('file', id, options, callback)
  }

}