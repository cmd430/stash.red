const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

module.exports = function (config, app, multer) {

  const models = require('./models.js')(app)

  // Unexposed Shared Functions
  async function auth(req, res) {
    let key = req.headers['authorization']
    if (config.auth.enabled) {
      if (!key || await async function () {
        return models.auth.find({
          key: key
        })
        .exec()
        .then(doc => {
          if (doc.length > 0) {
            return true
          } else {
            return false
          }
        })
        .catch(err => {
          return false
        })
      } === false) {
        return false
      }
      return key
    } else {
      return null
    }
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
        case 415:
          message = {
            error: 'unsupported media type'
          }
          break
        case 500:
          message = {
            error: 'internal error'
          }
          break
      }
    }
    return res.status(status).json(message)
  }

  function formatResults (req, results) {
    // Change paths to suit current host
    if (results.meta.type === 'file') {
      results.path = `${req.protocol}://${req.hostname}${results.path}`
      results.directpath = `${req.protocol}://${results.meta.mimetype.split('/')[0]}.${req.hostname}/${results.file}`
    } else if (results.meta.type === 'album') {
      results.path = `${req.protocol}://${req.hostname}${results.path}`
      results.files.images.forEach(image => {
        image.path = `${req.protocol}://${req.hostname}${image.path}`
        image.directpath = `${req.protocol}://${image.meta.mimetype.split('/')[0]}.${req.hostname}/${image.file}`
      })
      results.files.audio.forEach(audio => {
        audio.path = `${req.protocol}://${req.hostname}${audio.path}`
        audio.directpath = `${req.protocol}://${audio.meta.mimetype.split('/')[0]}.${req.hostname}/${audio.file}`
      })
      results.files.videos.forEach(video => {
        video.path = `${req.protocol}://${req.hostname}${video.path}`
        video.directpath = `${req.protocol}://${video.meta.mimetype.split('/')[0]}.${req.hostname}/${video.file}`
      })
    }
    return results
  }


  // Exposed Route Functions
  return logic = {

    // Send Asset Files
    sendAsset: async function (req, res) {
      let file = req.path
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
            return models[typeLong].findOne((id.length > 0 ? {
              id: id
            } : {}), {
              _id: 0
            })
            .lean()
            .exec()
            .then(result => {
              if (result) {
                return res.status(200).json(formatResults(req, result))
              } else {
                return error(res, 404)
              }
            })
            .catch(err => {
              return error(res, 500)
            })
          case 'u': // User
            return models.file.find((id.length > 0 ? {
              "meta.uploaded.by": id
            } : {}), {
              _id: 0
            })
            .lean()
            .exec()
            .then(files => {
              if (files) {
                return models.album.find((id.length > 0 ? {
                  "meta.uploaded.by": id
                } : {}), {
                  _id: 0
                })
                .lean()
                .exec()
                .then(albums => {
                  if (albums) {
                    files.forEach(file => {
                      file = formatResults(req, file)
                    })
                    albums.forEach(album => {
                      album = formatResults(req, album)
                    })
                    return res.status(200).json(files.concat(albums))
                  } else {
                    return error(res, 404)
                  }
                })
              } else {
                return error(res, 404)
              }
            })
            .catch(err => {
              return error(res, 500)
            })
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
      let userId = await auth(req, res)
      if (userId !== false) {
        // We are authorized
        // or auth is disabled
        multer.any()(req, res, err => {
          if (err) {
            return error(res, err.status || 500, err.message)
          } else {
            let files = req.files
            let isAblum = files.length > 1
            let albumId = crypto.randomBytes(config.identifiers.length).toString('hex')
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
                    by: (typeof userId !== null ? userId : null)
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
                    file.path = `${req.protocol}://${req.hostname}/${file.path}`
                    file.directpath = `${req.protocol}://${file.meta.mimetype.split('/')[0]}.${req.hostname}/${file.file}`
                    return res.status(200).json(file)
                  }
                }
              })
            })
            if (isAblum) {
              let albuminfo = {
                id: albumId,
                meta: {
                  uploaded: {
                    by: (typeof userId !== null ? userId : null)
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
                  album.path = `${req.protocol}://${req.hostname}/${album.path}`
                  return res.status(200).json(album)
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
      if (config.auth.key.generation.enabled) {
        if (await auth(req, res) !== false) {
          let authUser = req.headers['user']
          let authKey = crypto.randomBytes(config.auth.key.length).toString('hex')
          new models.auth({
            key: authKey,
            user: authUser
          })
          .save((err, newAuth) => {
            if (err) {
              return error(res, 500)
            } else {
              delete newAuth._id
              return res.status(200).json(newAuth)
            }
          })
        }
      }
    }

  }
}