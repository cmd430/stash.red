module.exports = (config, app) => {

  let albumSchema = new app.db.Schema({
    id: {
      type: String,
      required: true,
      index: {
        unique: true
      }
    },
    meta: {
      title: String,
      type: {
        type: String,
        default: 'album'
      },
      public: {
        type: Boolean,
        default: true
      },
      uploaded: {
        at: {
          type: Date,
          default: Date.now,
          index: true
        },
        by: {
          type: String,
          default: 'Anonymous'
        },
        until: {
          type: String,
          default: 'infinity'
        }
      }
    },
    path: String
  }, {
    versionKey: false
  })

  albumSchema.plugin(app.dbPlugins.paginate)
  return app.db.model('album', albumSchema)

}