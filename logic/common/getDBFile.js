module.exports = (config, app, common) => {

  return async function getDBFile (id, options, callback) {
    if (options instanceof Function) {
      callback = options
      options = {}
    }
    options = {
      searchByUploader: options.searchByUploader ? true : false,
      filesInAlbum: options.filesInAlbum  ? true : false,
      showPrivate: options.showPrivate ? true : false,
      withThumbnail: options.withThumbnail ? true : false,
      maxResults: options.maxResults ? options.maxResults : 0,
    }
    return common.queryDB('file', id, options, callback)
  }

}