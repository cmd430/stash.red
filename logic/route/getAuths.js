module.exports = (config, app, common, route) => {

  // Get all AuthKeys excluding Admin Authkey
  return async function getAuths (req, res) {
    if (config.auth.enabled && config.auth.generation.enabled) {
      let checkAuth = await common.auth(req, res)
      if (checkAuth !== false && checkAuth.username === 'admin') {
        app.db.models.auth.find({})
        .where({
          username: {
            $ne: 'admin'
          }
        })
        .lean()
        .exec((err, keys) => {
          if (err || !keys ) {
            return common.error(res, 500)
          } else {
            return res.status(200).json(keys)
          }
        })
      } else {
        return common.error(res, 401)
      }
    } else {
      return common.error(res, 400)
    }
  }

}