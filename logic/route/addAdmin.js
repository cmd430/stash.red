module.exports = (config, app, common, route) => {

  // Add the Admin authkey if missing
  return function addAdmin () {
    if (config.auth.enabled) {
      return app.db.models.auth.findOne({
        username: 'admin'
      }, {
        _id: 0
      })
      .lean()
      .exec()
      .then(result => {
        if (!result) {
          // Create Admin if missing
          return new app.db.models.auth({
            key: common.generateID(true),
            username: 'admin'
          })
          .save((err, auth) => {
            if (!err) {
              app.console.log(`Admin Auth Key: ${auth.key}`, 'cyan')
            }
          })
        }
      })
    }
  }

}