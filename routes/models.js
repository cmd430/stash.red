module.exports = app => {
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
    user: app.db.model('user', new app.db.Schema({
      id: {
        type: String,
        required: true,
        index: {
          unique: true
        }
      },
      albums: [],
      files: {
        images: [],
        videos: [],
        audio: []
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
        title: String
      },
      files: {
        images: [],
        videos: [],
        audio: []
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
        mimetype: String,
        original_name: String
      }
    }, {
      versionKey: false
    }))
  }
}