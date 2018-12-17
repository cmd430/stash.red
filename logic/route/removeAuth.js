module.exports = (config, app, common, route) => {

  // Remove a single Authkey
  return async function removeAuth (req, res) {
    if (config.auth.enabled && config.auth.generation.enabled) {
      let checkAuth = await common.auth(req, res)
      if (checkAuth !== false && checkAuth.username === 'admin') {
        let remove = req.headers['remove']
        if (remove === checkAuth.key || remove === checkAuth.username) {
          return common.error(res, 400)
        } else {
          app.db.models.auth.deleteOne({
            $or: [
              {
                username: remove
              },
              {
                key: remove
              }
            ]
          })
          .lean()
          .exec((err, key) => {
            if (err || !key ) {
              return common.error(res, 500)
            } else {
              if (key.ok === 1 && key.n === 1) {
                return res.status(200).json({
                  removed: remove
                })
              } else {
                return common.error(res, 500)
              }
            }
          })
        }
      } else {
        return common.error(res, 401)
      }
    } else {
      return common.error(res, 400)
    }
  }

}