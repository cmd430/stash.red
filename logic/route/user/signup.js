module.exports = (config, app, common, route) => {

  // Signup
  return async function signup (req, res, next) {
    if (!config.auth.allowSignup) {
      let err = new Error('Account creation is disabled.')
      err.status = 400
      return next(err)
    }
    if (req.body.email && req.body.username && req.body.password && req.body.passwordConfirm) {
      if (req.body.password !== req.body.passwordConfirm) {
        let err = new Error('Passwords do not match.')
        err.status = 400
        return next(err)
      }
      app.db.models.auth.create({
        email: req.body.email,
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
      let err = new Error('All fields required.')
      err.status = 400
      return next(err)
    }
  }

}