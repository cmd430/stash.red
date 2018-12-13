const path = require('path')

const webRoot = __dirname
const assetDir = path.join(webRoot, 'assets')
const viewsDir = path.join(webRoot, 'views')
const partialsDir = path.join(viewsDir, 'partials')
const storageBaseDir = path.join(webRoot, 'storage')
const storageDatabaseDir = path.join(storageBaseDir, 'database')
const storageImageDir = path.join(storageBaseDir, 'image')
const storageAudioDir = path.join(storageBaseDir, 'audio')
const storageVideoDir = path.join(storageBaseDir, 'video')
const serverName = 'stash.red'

const config = {
  server: {
    port: 80,
    name: serverName,
    subdomains: {
      image: 'image',
      audio: 'audio',
      video: 'video'
      // can change the subdomain for
      // the file types here IE. 'image'
      // could be set to 'i' and the
      // subdomain would change from
      // 'image.host.com' to `i.host.com`
    },
    debug: false
  },
  handelbars: {
    views: viewsDir,
    partials: partialsDir
  },
  render: {
    // Variables we pass the HTML pages
    // This is used to set meta info
    // on each page thanks to handelbars
    name: {
      fullname: `${serverName}`,
      fragment_one: `${serverName.split('.')[0].toUpperCase()}`,
      fragment_two: `${serverName.split('.')[1].toLowerCase()}`
    },
    opengraph: {
      theme: '#db0303'
    },
    github: 'cmd430/stash.red'
  },
  identifiers: {
    length: 5
  },
  upload: {
    maxsize: 1024 * 1024 * 500,
    // Default 500mb (1024 * 1024 * 500)
    // Size is in Bytes
    concurrency: 0,
    // Number of threads for auto roatation
    // 0 = Default (4)
    // http://sharp.pixelplumbing.com/en/stable/api-utility/#concurrency
    thumbnail: {
      // if diabled shows generic filetype placeholder
      enabled: true,
      // Size in pixels
      // can use null for width OR height
      // to maintain aspect ratio of image
      width: 250,
      height: 250,
      fit: 'cover',
      position: 'entropy',
      // http://sharp.pixelplumbing.com/en/stable/api-resize/#parameters
      concurrency: 1
      // Number of threads for thumbnail generation
      // 0 = Default (4)
      // http://sharp.pixelplumbing.com/en/stable/api-utility/#concurrency
    }
  },
  storage: {
    database: storageDatabaseDir,
    image: storageImageDir,
    audio: storageAudioDir,
    video: storageVideoDir,
    asset: assetDir,
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