const crypto = require('crypto')

module.exports = (config, app, common) => {

  return function generateID (isAdmin = false) {
    let keyLength = config.identifiers.length
    if (isAdmin) {
      keyLength = keyLength * 2
    }
    return crypto.randomBytes(keyLength).toString('hex')
  }

}