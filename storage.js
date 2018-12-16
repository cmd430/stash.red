const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const sharp = require('sharp')

function getDestination (req, file, config, callback) {
  let mimetype = file.mimetype
  let shorttype = mimetype.split('/')[0]
  let extention = path.extname(file.originalname) || `.${mimetype.split('/').pop()}`
  let id = crypto.randomBytes(config.identifiers.length).toString('hex')
  let filepath = `${id}${extention}`
  switch (shorttype) {
    case 'image':
    case 'audio':
    case 'video':
      return callback(null, `${config.storage[shorttype]}/${filepath}`)
    default:
      return callback({
        status: 400
      })
  }
}

function StreamedStorage (config, app) {
  this.app = app
  this.config = config
  this.getDestination = getDestination
}

StreamedStorage.prototype._handleFile = function _handleFile (req, file, callback) {
  let __success = false
  this.getDestination(req, file, this.config, (err, savepath) => {
    if (err) {
      return callback(err)
    } else {
      let outStream = fs.createWriteStream(savepath)
      if (file.mimetype.split('/')[0] === 'image') {
        file.stream
        .pipe(sharp().rotate())
        .pipe(outStream)
      } else {
        file.stream.pipe(outStream)
      }
      outStream.on('error', err => {
        let status = 500
        if (err.errno === 'ENOSPC') {
          status = 507
        }
        outStream.close()
        callback({
          status: status
        })
      })
      outStream.on('finish', () => {
        __success = true
        outStream.close()
        callback(null, {
          path: savepath,
          size: outStream.bytesWritten
        })
      })
      req.on('close', () => {
        if (!__success) {
          outStream.close()
          this._removeFile(req, {
            path: savepath
          }, callback)
        }
      })
    }
  })
}

StreamedStorage.prototype._removeFile = function _removeFile (req, file, callback) {
  fs.unlink(file.path, callback)
}

module.exports = function (config, app, opts) {
 return new StreamedStorage(config, app, opts)
}