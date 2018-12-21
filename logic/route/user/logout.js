module.exports = (config, app, common, route) => {

  // Logout
  return async function logout (req, res, next) {
    if (req.session) {
      req.session.destroy(err => {
        if (err) {
          return next(err)
        }
      })
    }
    return res.redirect('/')
  }

}