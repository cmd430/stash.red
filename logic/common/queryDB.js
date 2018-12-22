module.exports = (config, app, common) => {

  return async function queryDB (model, id, options, callback) {
    if (options instanceof Function) {
      callback = options
      options = {}
    }
    options = {
      searchByUploader: options.searchByUploader || false,
      filesInAlbum: options.filesInAlbum || false,
      showPrivate: options.showPrivate || false
    }

    let dbModel = app.db.models[model].find({
      id: id,
      'meta.public': {
        $in: [
          true,
          !options.showPrivate
        ]
      }
    }, {
      _id: 0
    })
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
      }, {
        _id: 0
      })
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
      }, {
        _id: 0
      })
    }
    return dbModel
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