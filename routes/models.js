module.exports = app => {
  let ObjectId = app.db.Schema.Types.ObjectId
  return {
    auth: app.db.model('auth', new app.db.Schema({
      id: {
        type: String,
        required: true,
        index: {
          unique: true
        }
      }
    }, {
      versionKey: false
    })),
    album: app.db.model('album', new app.db.Schema({
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
          default: 'album'
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
        title: String
      },
      files: {
        images: Array,
        videos: Array,
        audio: Array
      }
    }, {
      versionKey: false
    })),
    file: app.db.model('file', new app.db.Schema({
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
      path: String
    }, {
      versionKey: false
    }))
  }
}