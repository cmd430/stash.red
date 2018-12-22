module.exports = (config, app, common, route) => {

  // Signup
  return async function signup (req, res, next) {
    if (!config.auth.allowSignup) {
      return common.error(res, 503, new Error('account creation is disabled'))
    }
    if (req.body.username && req.body.password && req.body.passwordConfirm) {
      if (!app.captcha.check(req, req.body.captcha)) {
        return common.error(res, 400, new Error('captcha failed'))
      }
      if (req.body.password !== req.body.passwordConfirm) {
        return common.error(res, 400, new Error('passwords do not match'))
      }
      app.db.models.auth.create({
        username: req.body.username,
        password: req.body.password
      }, (err, auth) => {
        if (err) {
          return next(err)
        } else {
          req.session.user = auth._id
          return res.redirect('/')
        }
      })
    } else {
      return common.error(res, 400, new Error('all fields required'))
    }
  }

}