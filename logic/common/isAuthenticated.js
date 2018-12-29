module.exports = (config, app, common) => {

  return async function isAuthenticated (req) {
    return app.db.models.auth.findById(req.session.user)
    .lean()
    .exec()
    .then(auth => {
      return auth
    })
    .catch(err => {
      return null
    })
  }

}