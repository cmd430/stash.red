module.exports = (config, app, common) => {

  return async function queryDB (model, id, options, callback) {
    if (options instanceof Function) {
      callback = options
      options = {}
    }
    options = {
      searchByUploader: options.searchByUploader ? true : false,
      filesInAlbum: options.filesInAlbum ? true : false,
      showPrivate: options.showPrivate ? true : false,
      withThumbnail: options.withThumbnail ? true : false,
      maxResults: options.maxResults ? options.maxResults : 0
    }
    let projection = {
      _id: 0
    }
    if (!options.withThumbnail) {
      projection['meta.thumbnail'] = 0
    }
    let dbModel = app.db.models[model].find({
      id: id,
      'meta.public': {
        $in: [
          true,
          !options.showPrivate
        ]
      }
    }, projection)
    if (options.searchByUploader) {
      dbModel = app.db.models[model].find({
        'meta.uploaded.by': id,
        'meta.album': {
          $exists : false
        },
        'meta.public': {
          $in: [
            true,
            !options.showPrivate
          ]
        }
      }, projection)
    }
    if (options.filesInAlbum) {
      dbModel = app.db.models[model].find({
        'meta.album': id,
        'meta.public': {
          $in: [
            true,
            !options.showPrivate
          ]
        }
      }, projection)
    }
    return dbModel
    .limit(options.maxResults)
    .sort({
      'meta.uploaded.at': 'descending'
    })
    .lean()
    .exec()
    .then(result => {
      if (result) {
        return callback(null, result)
      } else {
        return callback({
          status: 404
        })
      }
    })
    .catch(err => {
      if (err.message === 'Cannot read property \'meta\' of undefined') {
        // if a user hasnot uploaded anything this error will be thrown
        return callback({
          status: 404,
        })
      }
      return callback({
        status: 500,
      })
    })
  }

}