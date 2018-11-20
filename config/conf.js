const path = require('path')

const webRoot = path.join(__dirname, '..')
const staticDir = path.join(webRoot, 'static')
const storageBaseDir = path.join(webRoot, 'storage')
const storageFilesDir = path.join(storageBaseDir, 'files')
const storageImageDir = path.join(storageFilesDir, 'image')
const storageAudioDir = path.join(storageFilesDir, 'audio')
const storageVideoDir = path.join(storageFilesDir, 'video')
const storageAlbumsDir = path.join(storageBaseDir, 'albums')
const storageUsersDir = path.join(storageBaseDir, 'users')

const authKeys = path.join(__dirname, 'authKeys.json')

const config = {
  port: 80,
  webroot: webRoot,

  storage: {
    base: storageBaseDir,
    files: {
      root: storageFilesDir,
      image: storageImageDir,
      audio: storageAudioDir,
      video: storageVideoDir
    },
    albums: storageAlbumsDir,
    users: storageUsersDir,
    static: staticDir
  },
  useAuth: true,
  authKeys: require(authKeys),
  logFormat: '[:date[web]] :method :url :status :response-time ms - :res[content-length]'
  // https://www.npmjs.com/package/morgan
}

module.exports = config