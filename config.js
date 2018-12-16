const path = require('path')
const chalk = require('chalk')

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
const logFormat = (tokens, req, res) => {
  // https://www.npmjs.com/package/morgan#tokens
  let date = tokens['date'](req, res, 'web')
  let method = tokens['method'](req, res)
  let url = tokens['url'](req, res)
  let status = tokens['status'](req, res) || 499
  let responseTime = tokens['response-time'](req, res) || 0
  let contentLength = tokens['res'](req, res, 'content-length')

  status = chalk.keyword(status >= 500 ? 'red' : status >= 400 ? 'yellow' : status >= 300 ? 'cyan' : 'green')(status)
  contentLength = contentLength ? `- ${contentLength}` : ''

  return `[${date}][${serverName}] ${status} ${method} ${url} ${responseTime} ms ${contentLength}`
}

const config = {
  server: {
    port: 80,
    name: serverName,
    subdomains: {
      image: 'image',
      audio: 'audio',
      video: 'video',
      download: 'download'
      // can change the subdomain for
      // the file types here IE. 'image'
      // could be set to 'i' and the
      // subdomain would change from
      // 'image.host.com' to `i.host.com`
    },
    debug: true,
    colors: true
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
    buffer: 1024 * 1024 * 2,
    // Default 2mb (1024 * 1024 * 2)
    // Size is in Bytes
    maxsize: 1024 * 1024 * 500,
    // Default 500mb (1024 * 1024 * 500)
    // Size is in Bytes
    thumbnail: {
      // if diabled shows generic filetype placeholder
      enabled: true,
      // Size in pixels
      // can use null for width OR height
      // to maintain aspect ratio of image
      width: 250,
      height: 250,
      fit: 'cover',
      position: 'entropy'
      // http://sharp.pixelplumbing.com/en/stable/api-resize/#parameters
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
  log: logFormat
}

module.exports = config
chalk.enabled = config.server.colors