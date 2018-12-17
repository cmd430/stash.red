module.exports = (app) => {

  let authSchema = new app.db.Schema({
    key: {
      type: String,
      required: true,
      index: {
        unique: true
      }
    },
    username: {
      type: String,
      default: 'Unknown'
    }
  }, {
    versionKey: false
  })

  return app.db.model('auth', authSchema)

}