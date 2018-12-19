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
          return app.db.models.auth.create({
            key: common.generateID({
              isAuth: true,
              isAdmin: true
            }),
            username: 'admin'
          }, (err, auth) => {
            if (!err) {
              app.console.log(`Admin Auth Key: ${auth.key}`, 'cyan')
            }
          })
        }
      })
    }
  }

}