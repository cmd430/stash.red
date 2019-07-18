const bcrypt = require('bcrypt')

module.exports = (config, app) => {

  let authSchema = new app.db.Schema({
    username: {
      type: String,
      unique: true,
      required: true,
      trim: true
    },
    password: {
      type: String,
      required: true
    },
    isAdmin: {
      type: Boolean,
      required: false,
      default: false,
    }
  }, {
    versionKey: false
  })

  authSchema.pre('save', function (next) {
    let auth = this
    bcrypt.hash(auth.password, config.auth.saltOrRounds, (err, hash) => {
      if (err) {
        return next(err)
      }
      auth.password = hash
      next()
    })
  })

  authSchema.statics.authenticate = (username, password, callback) => {
    app.db.models.auth.findOne({
      username: username
    }).exec((err, user) => {
      if (err) {
        return callback(err)
      } else if (!user) {
          let err = new Error('User not found.')
          err.status = 401
          return callback(err)
      }
      bcrypt.compare(password, user.password, (err, result) => {
        if (result === true) {
          return callback(null, user)
        } else {
          return callback()
        }
      })
    })
  }

  authSchema.plugin(app.dbPlugins.paginate)
  return app.db.model('auth', authSchema)

}