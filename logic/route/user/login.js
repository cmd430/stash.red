module.exports = (config, app, common, route) => {

  // Login
  return async function login (req, res, next) {
    if (req.session.user) {
      return res.redirect('/')
    }
    if (req.body.username && req.body.password) {
      app.db.models.auth.authenticate(req.body.username, req.body.password, (error, user) => {
        if (error || !user) {
          let err = new Error('Incorrect user or password.')
          err.status = 401
          return next(err)
        } else {
          req.session.user = user._id
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