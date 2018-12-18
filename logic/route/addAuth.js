module.exports = (config, app, common, route) => {

  // Add a single Authkey
  return async function addAuth (req, res) {
    if (config.auth.enabled && config.auth.generation.enabled) {
      let checkAuth = await common.auth(req, res)
      if (checkAuth !== false && checkAuth.username === 'admin') {
          let authUser = req.headers['add']
          let authKey = common.generateID({
            isAuth: true,
            isAdmin: false
          })
          new app.db.models.auth({
            key: authKey,
            username: authUser
          })
          .save((err, newAuth) => {
            if (err) {
              return common.error(res, 500)
            } else {
              return res.status(200).json({
                username: newAuth.username,
                key: newAuth.key
              })
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