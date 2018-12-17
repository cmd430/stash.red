module.exports = (config, app, common) => {

  return async function queryDB (model, id, callback, searchByUploader = false, filesInAlbum = false) {
    var dbModel = app.db.models[model].find({
      id: id
    }, {
      _id: 0
    })
    if (searchByUploader) {
      var dbModel = app.db.models[model].find({
        'meta.uploaded.by': id,
        'meta.album': {
          $exists : false
        }
      }, {
        _id: 0
      })
    }
    if (filesInAlbum) {
      var dbModel = app.db.models[model].find({
        'meta.album': id
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