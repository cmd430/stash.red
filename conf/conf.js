const path = require('path')

const rootDir = path.join(__dirname, '..')
const uploadDir = path.join(rootDir, 'upload')
const authKeys = path.join(__dirname, 'authKeys.json')

const config = {
  port: 80,
  rootDir: rootDir,
  uploadDir: uploadDir,
  useAuth: true,
  authKeys: require(authKeys),
  logFormat: '[:date[web]] :method :url :status :response-time ms - :res[content-length]'
  // https://www.npmjs.com/package/morgan
}

module.exports = config