const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

module.exports = function (config, app, multer) {

  const models = require('./models.js')(app)

  // Unexposed Shared Functions
  async function auth(req, res) {
    let authkey = req.headers['authorization']
    if (config.auth.enabled) {
      if (!authkey) {
        return false
      } else {
        return models.auth.findOne({
          key: authkey
        }, {
          _id: 0
        })
        .lean()
        .exec()
        .then(auth => {
          if (auth) {
            return auth
          } else {
            return false
          }
        })
        .catch(err => {
          return false
        })
      }
    } else {
      return null
    }
  }

  function generateID (isAdmin = false) {
    let keyLength = config.identifiers.length
    if (isAdmin) {
      keyLength = keyLength * 2
    }
    return crypto.randomBytes(keyLength).toString('hex')
  }

  function fileExists (res, filepath, callback) {
    return fs.access(`${filepath}`, fs.constants.R_OK, err => {
      if (err) {
        return error(res, 404)
      } else {
        callback()
      }
    })
  }

  function error (res, status, message) {
    if (typeof message === 'undefined') {
      switch (status) {
        case 400:
          message = {
            error: 'bad request'
          }
          break
        case 401:
          message = {
            error: 'unauthorized'
          }
          break
          case 404:
          message = {
            error: 'file not found'
          }
          break
        case 413:
          message = {
            error: 'payload too large'
          }
          break
        case 500:
          message = {
            error: 'internal error'
          }
          break
        case 507:
          message = {
            error: 'insufficient storage'
          }
          break
      }
    }
    return res.status(status).json(message)
  }

  function formatResults (req, results) {
    // Change paths to suit current host
    results.forEach(result => {
      if (result.meta.type === 'file') {
        result.path = `${req.protocol}://${req.hostname}${result.path}`
        result.directpath = `${req.protocol}://${result.meta.mimetype.split('/')[0]}.${req.hostname}/${result.file}`
      } else if (result.meta.type === 'album') {
        result.path = `${req.protocol}://${req.hostname}${result.path}`
        result.files.images.forEach(image => {
          image.path = `${req.protocol}://${req.hostname}${image.path}`
          image.directpath = `${req.protocol}://${image.meta.mimetype.split('/')[0]}.${req.hostname}/${image.file}`
        })
        result.files.audio.forEach(audio => {
          audio.path = `${req.protocol}://${req.hostname}${audio.path}`
          audio.directpath = `${req.protocol}://${audio.meta.mimetype.split('/')[0]}.${req.hostname}/${audio.file}`
        })
        result.files.videos.forEach(video => {
          video.path = `${req.protocol}://${req.hostname}${video.path}`
          video.directpath = `${req.protocol}://${video.meta.mimetype.split('/')[0]}.${req.hostname}/${video.file}`
        })
      }
    })
    return results
  }

  function queryDB (model, id, callback, searchByUploader = false) {
    return models[model]
    .find((searchByUploader ? (id.length > 0 ? {
      "meta.uploaded.by": id
    } : {}) : (id.length > 0 ? {
      id: id
    } : {})), {
      _id: 0
    })
    .lean()
    .exec()
    .then(result => {
      if (result) {
          return callback(null, result)
      } else {
        return callback({
          status: 404
        })
      }
    })
    .catch(err => {
      return callback({
        status: 500
      })
    })
  }

  // Exposed Route Functions
  return logic = {

    // Send Asset Files
    sendAsset: async function (req, res) {
      let file = req.path
      if (file.includes('favicon.ico')) {
        file = `${config.storage.static}/img/${file}`
      } else {
        let subdomains = req.subdomains
        if (subdomains.length > 0 && (file.includes('.html') || file === '/')) {
          // We only want to serve asset files from
          // the 'static' subdomain and the index from
          // the host domain (and the upload files from)
          // there relevant subdomains so we redirect
          // any html requests comming from a
          // subdomain to the homepage...
          return res.redirect(`${req.protocol}://${req.hostname.match(/[^\.]*\.[^.]*$/)[0]}/`)
        }
        if (subdomains.includes('image')) {
          file = `${config.storage.image}${file}`
        } else if (subdomains.includes('audio')) {
          file = `${config.storage.audio}${file}`
        } else if (subdomains.includes('video')) {
          file = `${config.storage.video}${file}`
        } else {
          file = `${config.storage.static}${file}`
        }
      }
      return fileExists(res, file, () => {
        return res.status(200).sendFile(`${file}`)
      })
    },

    // View File / View Album / User Page | View File / View Album / User JSON
    viewPage: async function (req, res) {
      let type = req.params.type
      let typeLong = (type === 'f' ? 'file' : (type === 'a' ? 'album' : 'user'))
      if (req.params.id.includes('.json')) {
        let id = req.params.id.split('.')[0]
        switch (type) {
          case 'f': // File
          case 'a': // Album
            return queryDB(typeLong, id, (err, data) => {
              if (err) {
                return error(res, err.status)
              } else {
                if (id.length > 0 && data.length > 0) {
                  return res.status(200).json(formatResults(req, data)[0])
                } else if (data.length > 0) {
                  return res.status(200).json(formatResults(req, data))
                }
              }
            })
          case 'u': // User
            return queryDB('file', id, (err, data) => {
              if (err) {
                return error(res, err.status)
              } else {
                let files = formatResults(req, data)
                return queryDB('album', id, (err, data) => {
                  if (err) {
                    return error(res, err.status)
                  } else {
                    let albums = formatResults(req, data)
                    let user = files.concat(albums)
                    if (user.length > 0) {
                      return res.status(200).json(user)
                    } else {
                      return error(res, 404)
                    }
                  }
                }, true)
              }
            }, true)
          default: // Error
            return error(res, 404)
        }
      } else {
        switch (type) {
          case 'f': // File
          case 'a': // Album
          case 'u': // User
            return res.status(200).sendFile(`${config.storage.static}/${typeLong}.html`)
          default: // Error
            return error(res, 404)
        }
      }
    },

    uploadFile: async function (req, res) {
      let user = await auth(req, res)
      if (user !== false) {
        // We are authorized
        // or auth is disabled
        multer.any()(req, res, err => {
          if (err) {
            if (err.code === 'LIMIT_FILE_SIZE') {
              err.status = 413
            }
            if (err.status === 'undefined') {
              err.status =  500
            }
            return error(res, err.status)
          } else {
            let files = req.files
            let isAblum = files.length > 1
            let images = []
            let audio = []
            let videos = []
            files.forEach(file => {
              let filename = path.basename(file.path)
              let extension = path.extname(filename)
              let id = path.basename(filename, extension)
              let mimetype = file.mimetype
              let shorttype = mimetype.split('/')[0]
              let fileinfo = {
                id: id,
                meta: {
                  originalname: file.originalname,
                  mimetype: mimetype,
                  size: file.size,
                  uploaded: {
                    by: (typeof user !== null ? user.username : null)
                  }
                },
                file: filename,
                path: `/f/${id}`
              }
              switch (shorttype) {
                case 'image':
                  images.push(fileinfo)
                  break
                case 'audio':
                audio.push(fileinfo)
                  break
                case 'video':
                videos.push(fileinfo)
                  break
              }
              new models.file(fileinfo)
              .save((err, file) => {
                if (err) {
                  return error(res, 500)
                } else {
                  if (!isAblum) {
                    return res.status(200).json(formatResults(req, file))
                  }
                }
              })
            })
            if (isAblum) {
              let albumId = generateID()
              let albuminfo = {
                id: albumId,
                meta: {
                  uploaded: {
                    by: (typeof user !== null ? user.username : null)
                  },
                  title: null
                },
                files: {
                  images: images,
                  audio: audio,
                  videos: videos
                },
                path: `/a/${albumId}`
              }
              new models.album(albuminfo)
              .save((err, album) => {
                if (err) {
                  return error(res, 500)
                } else {
                  return res.status(200).json(formatResults(req, album))
                }
              })
            }
          }
        })
      } else {
        return error(res, 401)
      }
    },

    addAuth: async function (req, res) {
      if (config.auth.enabled && config.auth.generation.enabled) {
        let checkAuth = await auth(req, res)
        if (checkAuth !== false && checkAuth.username === 'admin') {
            let authUser = req.headers['add']
            let authKey = generateID()
            new models.auth({
              key: authKey,
              username: authUser
            })
            .save((err, newAuth) => {
              if (err) {
                return error(res, 500)
              } else {
                return res.status(200).json({
                  username: newAuth.username,
                  key: newAuth.key
                })
              }
            })
        } else {
          return error(res, 401)
        }
      } else {
        return error(res, 400)
      }
    },

    removeAuth: async function(req, res) {
      if (config.auth.enabled && config.auth.generation.enabled) {
        let checkAuth = await auth(req, res)
        if (checkAuth !== false && checkAuth.username === 'admin') {
          let remove = req.headers['remove']
          if (remove === checkAuth.key || remove === checkAuth.username) {
            return error(res, 400)
          } else {
            console.log(remove)
            models.auth.deleteOne({
              $or: [
                {
                  username: remove
                },
                {
                  key: remove
                }
              ]
            })
            .lean()
            .exec((err, key) => {
              console.log(key)
              if (err || !key ) {
                return error(res, 500)
              } else {
                if (key.ok === 1 && key.n === 1) {
                  return res.status(200).json({
                    removed: remove
                  })
                } else {
                  return error(res, 500)
                }
              }
            })
          }
        } else {
          return error(res, 401)
        }
      } else {
        return error(res, 400)
      }
    },

    getAuths: async function(req, res) {
      if (config.auth.enabled && config.auth.generation.enabled) {
        let checkAuth = await auth(req, res)
        if (checkAuth !== false && checkAuth.username === 'admin') {
          models.auth.find({})
          .where({
            username: {
              $ne: 'admin'
            }
          })
          .lean()
          .exec((err, keys) => {
            if (err || !keys ) {
              return error(res, 500)
            } else {
              return res.status(200).json(keys)
            }
          })
        } else {
          return error(res, 401)
        }
      } else {
        return error(res, 400)
      }
    },

    addAdmin: function () {
      if (config.auth.enabled) {
        return models.auth.findOne({
          username: 'admin'
        }, {
          _id: 0
        })
        .lean()
        .exec()
        .then(result => {
          if (!result) {
            // Create Admin if missing
            return new models.auth({
              key: generateID(true),
              username: 'admin'
            })
            .save((err, auth) => {
              if (!err) {
                app.console.log(`Admin Auth Key: ${auth.key}`)
              }
            })
          }
        })
      }
    }

  }
}