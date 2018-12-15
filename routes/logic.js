const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const ffmpeg = require('ffmpeg-static')
const simpleThumbnail = require('simple-thumbnail')
const jsmediatags = require('jsmediatags')
const sharp = require('sharp')

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

  async function asyncForEach(array, callback) {
    for (let index = 0; index < array.length; index++) {
      await callback(array[index], index, array)
    }
  }

  async function generateThumbnail (file, type) {
    app.console.debug(`Generating thumbnail for file: ${path.basename(file)}`)
    sharp.concurrency(config.upload.thumbnail.concurrency)
    return new Promise((resolve, reject) => {
      switch (type) {
        case 'image':
          return resolve(sharp(file).toBuffer())
        case 'video':
          return simpleThumbnail(file, null, '100%', {
            seek: '00:00:03.00',
            path: ffmpeg.path
          })
          .then(stream => {
            stream.on('data', data => {
              return resolve(data)
            })
            stream.on('error', err => {
              return reject(data)
            })
          })
        case 'audio':
          return new jsmediatags.Reader(file)
          .setTagsToRead([
            'picture'
          ])
          .read({
            onSuccess: data => {
              let picture = data.tags.picture
              if (picture === undefined){
                return reject({
                  message: 'no picute data'
                })
              }
              return resolve(Buffer.from(picture.data))
            },
            onError: err => {
              return reject(err)
            }
          })
      }
    })
    .then(buffer => {
      app.console.debug(`Scaling thumbnail for file: ${path.basename(file)}`)
      return sharp(buffer)
      .resize({
        width: config.upload.thumbnail.width,
        height: config.upload.thumbnail.height,
        fit: config.upload.thumbnail.fit,
        position: config.upload.thumbnail.position
      })
      .png()
      .toBuffer()
    })
    .then(thumbnail => {
      app.console.debug(`Generated thumbnail for file: ${path.basename(file)}`)
      return `data:image/png;base64,${thumbnail.toString('base64')}`
    })
    .catch(err => {
      app.console.debug(`Unable to generate thumbnail for file: ${path.basename(file)}`)
      return null
    })
  }

  async function getAudioMeta (file) {
    app.console.debug(`Processing audio meta for file: ${path.basename(file)}`)
    return new Promise((resolve, reject) => {
      return new jsmediatags.Reader(file)
      .setTagsToRead([
        'title',
        'album',
        'artist'
      ])
      .read({
        onSuccess: meta => {
          app.console.debug(`Processed audio meta for file: ${path.basename(file)}`)
          return resolve(meta.tags)
        },
        onError: err => {
          app.console.debug(`Unable to process audio meta for file: ${path.basename(file)}`)
          return reject(null)
        }
      })
    })
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
        case 501:
          message = {
            error: 'not implemented'
          }
          break
        case 507:
          message = {
            error: 'insufficient storage'
          }
          break
      }
    }
    return res.status(status).json({
      status: status,
      error: message.message || message.error
    })
  }

  function formatResults (req, results) {
    // Change paths to suit current host
    let addPaths = (result, isFile = true) => {
      if (!isFile) {
        result.path = `${req.protocol}://${req.hostname}${result.path}`
      } else {
        let subdomain = app.subdomain[result.meta.type].name
        result.path = `${req.protocol}://${req.hostname}${result.path}`
        result.directpath = `${req.protocol}://${subdomain}.${req.hostname}/${result.meta.filename}`
      }
    }
    let format = result => {
      if (result.meta.type === 'album') {
        addPaths(result, false)
        if (result.meta.title === null) {
          result.meta.title = 'Album'
        }
        result.files.forEach(file => {
          addPaths(file)
        })
      } else if (result.meta.type === 'user') {
        addPaths(result, false)
        result.files.forEach(file => {
          addPaths(file)
        })
        result.albums.forEach(album => {
          format(album)
        })
      } else {
        addPaths(result)
      }
    }
    if (Array.isArray(results)) {
      results.forEach(result => {
        format(result)
      })
    } else {
      format(results)
    }
    return results
  }

  async function getDBFiles (id, callback, searchByUploader = false, filesInAlbum = false) {
    return queryDB('file', id, callback, searchByUploader, filesInAlbum)
  }

  async function getDBAlbum (id, callback, searchByUploader = false) {
    return queryDB('album', id, async (err, result) => {
      if (err) {
        return callback(err)
      }
      await asyncForEach(result, async album => {
        await getDBFiles(album.id, async (err, f_result) => {
          if (err) {
            return callback(err)
          }
          album.files = f_result
          album.meta.thumbnail = album.files[0].meta.thumbnail
        }, false, true)
      })

      return callback(null, result)
    }, searchByUploader)
  }

  async function getDBUser (id, callback) {
    let albums = await getDBAlbum(id, async (err, a_data) => {
      if (err) {
        return callback(err)
      }
      return a_data
    }, true)
    let files = await getDBFiles(id, async (err, f_data) => {
      if (err) {
        return callback(err)
      }
      return f_data
    }, true, false)
    let user = [{
      meta: {
        username: id,
        type: 'user'
      },
      albums: albums,
      files: files,
      path: `/u/${id}`
    }]
    if (albums.concat(files).length === 0) {
      return callback(null, [])
    }
    return callback(null, user)
  }

  async function queryDB (model, id, callback, searchByUploader = false, filesInAlbum = false) {
    var dbModel = models[model].find({
      id: id
    }, {
      _id: 0
    })
    if (searchByUploader) {
      var dbModel = models[model].find({
        'meta.uploaded.by': id,
        'meta.album': {
          $exists : false
        }
      }, {
        _id: 0
      })
    }
    if (filesInAlbum) {
      var dbModel = models[model].find({
        'meta.album': id
      }, {
        _id: 0
      })
    }
    return dbModel
    .sort({
      'meta.uploaded.at': 'descending'
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
      if (err.message === 'Cannot read property \'meta\' of undefined') {
        // if a user hasnot uploaded anything this error will be thrown
        return callback({
          status: 404,
        })
      }
      return callback({
        status: 500,
      })
    })
  }

  // Exposed Route Functions
  return logic = {

    // Not Implemented methods
    notImplemented: async function (req, res) {
      return error(res, 501)
    },

    // Send Asset Files
    sendAsset: async function (req, res) {
      let file = req.path
      if (file.includes('favicon.ico')) {
        file = `${config.storage.asset}/img/${file}`
      } else {
        let subdomains = req.subdomains
        if (file.includes('.html') || file === '/') {
          // We only want to serve image/audio/video files
          // from the subdomains, so we redirect html
          // requests back to the host domain
          return res.redirect(`${req.protocol}://${req.hostname.match(/[^\.]*\.[^.]*$/)[0]}/`)
        }
        if (subdomains.includes(`${app.subdomain.image.name}`)) {
          file = `${config.storage.image}${file}`
        } else if (subdomains.includes(`${app.subdomain.audio.name}`)) {
          file = `${config.storage.audio}${file}`
        } else if (subdomains.includes(`${app.subdomain.video.name}`)) {
          file = `${config.storage.video}${file}`
        } else {
          file = `${config.storage.asset}${file}`
        }
      }
      return fileExists(res, file, () => {
        return res.status(200).sendFile(`${file}`)
      })
    },

    // View File / View Album / User Page | View File / View Album / User JSON
    viewPage: async function (req, res, next) {
      let type = req.params.type
      if (type === undefined) {
        // Serve our Homepage
        res.render('index.hbs', {
          server: config.render
        })
      } else {
        let typeLong = (type === 'f' ? 'file' : (type === 'a' ? 'album' : 'user'))
        let id = req.params.id
        let rawJSON = false
        if (req.params.id.includes('.json')) {
          id = id.split('.')[0]
          rawJSON = true
        }
        switch (type) {
          case 'f': // File
            return getDBFiles(id, render)
          case 'a': // Album
            return getDBAlbum(id, render)
          case 'u': // User
            return getDBUser(id, render)
          default: // Error
            if (!rawJSON) {
              // We are probably trying to load an asset
              // so we return next to try the next matching
              // route that should be the asset route
              // if the file doesnt match on that route we
              // will receive the 404
              return next()
            } else {
              return error(res, 404)
            }
        }
        // Do the render from results
        function render (err, data) {
          if (err) {
            return error(res, err.status)
          } else {
            if (data.length > 0) {
              let dynamic = {
                server: config.render
              }
              dynamic[typeLong] = formatResults(req, data)[0]
              if (!rawJSON) {
                return res.status(200).render(`${typeLong}.hbs`, dynamic)
              } else {
                return res.status(200).json(dynamic[typeLong])
              }
            } else {
              return error(res, 404)
            }
          }
        }
      }
    },

    uploadFile: async function (req, res) {
      let user = await auth(req, res)
      if (user !== false) {
        // We are authorized
        // or auth is disabled
        return multer.any()(req, res, async err => {
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
            let albumId = null
            if (files.length > 1) {
              albumId = generateID()
            }
            let filesinfo = []
            await asyncForEach(files, async file => {
              let filename = path.basename(file.path)
              let extension = path.extname(filename)
              let id = path.basename(filename, extension)
              let mimetype = file.mimetype
              let shorttype = mimetype.split('/')[0]
              let thumbnail = null
              if (config.upload.thumbnail.enabled) {
                thumbnail = await generateThumbnail(file.path, shorttype)
              }
              let fileinfo = {
                id: id,
                meta: {
                  thumbnail: thumbnail,
                  filename: filename,
                  originalname: file.originalname,
                  mimetype: mimetype,
                  size: file.size,
                  uploaded: {
                    by: (typeof user !== null ? user.username : undefined)
                  },
                  type: shorttype
                },
                path: `/f/${id}`
              }
              switch (shorttype) {
                case 'audio':
                  let audioMeta = await getAudioMeta(file.path)
                  fileinfo.meta.song = {
                    title: audioMeta.title || 'Unknown',
                    album: audioMeta.album || 'Unknown',
                    artist: audioMeta.artist || 'Unknown'
                  }
                case 'image':
                case 'video':
                  if (albumId) {
                    fileinfo.meta.album = albumId
                  }
                  filesinfo.push(fileinfo)
                  break
              }
              app.console.debug(`Adding database entry for file: ${filename}`)
              new models.file(fileinfo)
              .save((err, file) => {
                if (err) {
                  app.console.debug(`Unable to add database entry for file: ${filename}`)
                  return error(res, 500)
                } else {
                  app.console.debug(`Added database entry for file: ${filename}`)
                  if (!albumId) {
                    return res.status(200).json(formatResults(req, file))
                  }
                }
              })
            })
            if (albumId) {
              let albuminfo = {
                id: albumId,
                meta: {
                  uploaded: {
                    by: (typeof user !== null ? user.username : null)
                  },
                  title: null
                },
                path: `/a/${albumId}`
              }
              app.console.debug(`Adding database entry for album: ${albumId}`)
              new models.album(albuminfo)
              .save((err, album) => {
                if (err) {
                  app.console.debug(`Unable to add database entry for album: ${albumId}`)
                  return error(res, 500)
                } else {
                  app.console.debug(`Added database entry for album: ${albumId}`)
                  album.files = filesinfo
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

    removeFile: async function (req, res) {
      let user = await auth(req, res)
      if (user !== false) {
        let fileID = req.params.id
        return queryDB('file', fileID, (err, data) => {
          if (err) {
            return error(res, err.status)
          }
          data = data[0]
          if (data.meta.uploaded.by !== user.username) {
            return error(res, 401)
          }
          fs.unlink(path.join(config.storage[data.meta.type], data.meta.filename), err => {
            if (err) {
              return error(res, 500)
            }
            models.file.findOneAndRemove({
              id: fileID
            }, err => {
              if (err) {
                return error(res, 500)
              }
              return res.sendStatus(200)
            })
          })
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
                app.console.log(`Admin Auth Key: ${auth.key}`, 'cyan')
              }
            })
          }
        })
      }
    }

  }
}