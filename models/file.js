module.exports = (config, app) => {

  let fileSchema = new app.db.Schema({
    id: {
      type: String,
      required: true,
      index: {
        unique: true
      }
    },
    meta: {
      type: {
        type: String
      },
      public: {
        type: Boolean,
        default: true
      },
      uploaded: {
        at: {
          type: Date,
          default: Date.now
        },
        by: {
          type: String,
          default: 'Anonymous'
        },
        until: {
          type: String,
          default: 'infinity'
        }
      },
      song: {
        title: String,
        album: String,
        artist: String
      },
      thumbnail: {
        type: String,
        default: null
      },
      filename: String,
      originalname: String,
      mimetype: String,
      size: Number,
      album: String
    },
    path: String,
    directpath: String
  }, {
    versionKey: false
  })

  fileSchema.plugin(app.dbPlugins.paginate)
  return app.db.model('file', fileSchema)

}