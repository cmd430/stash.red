module.exports = (config, app, common) => {

  return async function auth (req, res) {
    let authkey = req.headers['authorization']
    if (config.auth.enabled) {
      if (!authkey) {
        return false
      } else {
        return app.db.models.auth.findOne({
          key: authkey
        }, {
          _id: 0
        })
        .lean()
        .exec()
        .then(auth => {
          if (auth) {
            return auth
          } else {
            return false
          }
        })
        .catch(err => {
          return false
        })
      }
    } else {
      return null
    }
  }

}