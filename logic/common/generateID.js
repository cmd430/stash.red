const crypto = require('crypto')

module.exports = (config, app, common) => {

  return function generateID (opts = {
    isAuth: false,
    isAdmin: false
  }) {
    // Set ID length - File/Album
    let keyLength = config.identifiers.length
    if (opts.isAuth && !opts.isAdmin) {
      // Set ID length - AuthKey
      keyLength = config.auth.generation.length
    }
    if (opts.isAuth && opts.isAdmin) {
      // Set ID length - Admin AuthKey
      keyLength = config.auth.generation.length * 2
    }
    return crypto.randomBytes(keyLength).toString('hex')
  }

}