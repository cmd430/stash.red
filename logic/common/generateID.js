const crypto = require('crypto')

module.exports = (config, app, common) => {

  return function generateID () {
    let keyLength = config.identifiers.length
    return crypto.randomBytes(keyLength).toString('hex')
  }

}