module.exports = (config, app, common, route) => {

  // Login
  return async function login (req, res, next) {
    if (req.session.user) {
      return res.redirect('/')
    }
    if (req.body.username && req.body.password) {
      app.db.models.auth.authenticate(req.body.username, req.body.password, (error, user) => {
        if (error || !user) {
          return common.error(res, 401, new Error('incorrect username or password'))
        } else {
          req.session.user = user._id
          return res.redirect('/')
        }
      })
    } else {
      return common.error(res, 400, new Error('all fields required'))
    }
  }

}