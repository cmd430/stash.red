const path = require('path')

const rootDir = path.join(__dirname, '..')
const uploadDir = path.join(rootDir, 'upload')
const authKeys = path.join(__dirname, 'authKeys.json')

const config = {
  port: 80,
  rootDir: rootDir,
  uploadDir: uploadDir,
  useAuth: false,
  authKeys: require(authKeys)
}

module.exports = config