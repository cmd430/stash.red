const path = require('path')

const webRoot = __dirname
const staticDir = path.join(webRoot, 'static')
const storageBaseDir = path.join(webRoot, 'storage')
const storageDatabaseDir = path.join(storageBaseDir, 'database')
const storageImageDir = path.join(storageBaseDir, 'image')
const storageAudioDir = path.join(storageBaseDir, 'audio')
const storageVideoDir = path.join(storageBaseDir, 'video')
const serverName = 'TheShed.red'

const config = {
  server: {
    port: 80,
    name: serverName
  },
  identifiers: {
    length: 5
  },
  upload: {
    maxsize: 1024 * 1024 * 500
    // Default 500mb (1024 * 1024 * 500)
  },
  storage: {
    database: storageDatabaseDir,
    image: storageImageDir,
    audio: storageAudioDir,
    video: storageVideoDir,
    static: staticDir
  },
  auth: {
    enabled: true,
    generation: {
      enabled: true,
      length: 8
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
      // https://docs.mongodb.com/master/tutorial/enable-authentication/
    },
    options: {
      useCreateIndex: true,
      useNewUrlParser: true,
      useFindAndModify: false
    }
  },
  log: `[:date[web]][${serverName}] :method :url :status :response-time ms - :res[content-length]`
  // https://www.npmjs.com/package/morgan#tokens
}

module.exports = config