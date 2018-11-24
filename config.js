const path = require('path')

const webRoot = path.join(__dirname)
const staticDir = path.join(webRoot, 'static')
const storageBaseDir = path.join(webRoot, 'storage')
const storageImageDir = path.join(storageBaseDir, 'image')
const storageAudioDir = path.join(storageBaseDir, 'audio')
const storageVideoDir = path.join(storageBaseDir, 'video')

const config = {
  port: 80,
  identifiers: {
    length: 5
  },
  storage: {
    image: storageImageDir,
    audio: storageAudioDir,
    video: storageVideoDir,
    static: staticDir
  },
  auth: {
    enabled: true,
    key: {
      length: 8,
      generation: {
        enabled: true
      }
    }
  },
  mongo: {
    db: 'theshed_red',
    host: 'localhost',
    port: 27017,
    auth: {
      enabled: false,
      user: null,
      pass: null
      //  https://docs.mongodb.com/master/tutorial/enable-authentication/
    },
    options: {
      useCreateIndex: true,
      useNewUrlParser: true,
      useFindAndModify: false
    }
  },
  log: '[:date[web]] :method :url :status :response-time ms - :res[content-length]'
  // https://www.npmjs.com/package/morgan#tokens
}

module.exports = config