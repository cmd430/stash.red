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
const storageTempDir = path.join(storageBaseDir, 'temp')

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
    debug: false,
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
      fragmentOne: `${serverName.split('.')[0].toUpperCase()}`,
      fragmentTwo: `${serverName.split('.')[1].toLowerCase()}`
    },
    opengraph: {
      icon: '/img/favicon.png',
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
      size: 250,
      fit: 'cover',
      position: 'entropy',
      background: {
        r: 0,
        g: 0,
        b: 0,
        alpha: 0
      },
      kernel: 'lanczos3',
      withoutEnlargement: true,
      fastShrinkOnLoad: true,
      quaility: 50 // 0-100
      // http://sharp.pixelplumbing.com/en/stable/api-resize/#parameters
    }
  },
  storage: {
    database: storageDatabaseDir,
    image: storageImageDir,
    audio: storageAudioDir,
    video: storageVideoDir,
    asset: assetDir,
    temp: storageTempDir
  },
  auth: {
    // if you dont want to allow
    // new accounts set this to false
    allowSignup: true,
    // salt for password hashing as String
    // or number of rounds as Number
    // Default: 10
    saltOrRounds: 10,
    session: {
      secret: 'stash',
      cookie: {
        secure: 'auto',
        maxAge: 259200000 // 3 days from last visit (in ms) - can be a Date() object i.e new Date(253402300000000) for a cookie that expires in 31/12/9999
      }
    },
    captcha: {
      // accepts any option that is accepted by
      // https://github.com/lemonce/svg-captcha
      //
      // plus enabled (Boolen), isMath (Boolen), useFont (String) and cookie (String)
      //
      // setting isMath to true will enable math expressions
      // while false will use text strings defaults to false
      //
      // useFont can be set to the path of a ttf or otf font
      // for use in the captcha
      //
      // cookie is the value for the key in the cookie to
      // store the captcha information, this can be ommited
      // to use the default of 'captcha'
      enabled: false,
      isMath: false,
      useFont: null,
      cookie: 'captcha',
      fontSize: 40,
      width: 100,
      height: 40,
      charPreset: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&?*=<>',
      ignoreChars: '0oO1iIlL',
      size: 4,
      noise: 2,
      color: false
    }
  },
  mongo: {
    db: 'stash',
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
    },
    paginate: {
      // Limit results per page on userpage
      // Reccomended values are 24-60 (in multiples of 4)
      limit: 24
    }
  },
  log: logFormat
}

module.exports = config
chalk.enabled = config.server.colors