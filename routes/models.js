module.exports = app => {

  let authSchema = new app.db.Schema({
    key: {
      type: String,
      required: true,
      index: {
        unique: true
      }
    },
    user: {
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
        type: String,
        default: 'file'
      },
      uploaded: {
        at: {
          type: Date,
          default: Date.now
        },
        by: {
          type: String,
          default: 'Anonymous'
        }
      },
      originalname: String,
      mimetype: String,
      size: Number,
    },
    file: String,
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
      uploaded: {
        at: {
          type: Date,
          default: Date.now
        },
        by: {
          type: String,
          default: 'Anonymous'
        }
      },
      type: {
        type: String,
        default: 'album'
      }
    },
    files: {
      images: Array,
      audio: Array,
      videos: Array
    },
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