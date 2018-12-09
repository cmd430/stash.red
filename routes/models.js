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
    },
    path: String,
    directpath: String
  }, {
    versionKey: false
  })
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
      thumbnail: {
        type: String,
        default: null
      }
    },
    files: Array,
    path: String
  }, {
    versionKey: false
  })

  let Auth = app.db.model('Auth', authSchema)
  let File = app.db.model('File', fileSchema)
  let Album = app.db.model('Album', albumSchema)

  return {
    auth: Auth,
    file: File,
    album: Album
  }
}