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
          id: key
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
        return error(res, 401)
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
              } : {}))
            .lean()
            .exec()
            .then(results => {
              if (results) {
                if (results.meta.type === 'file') {
                  results.directpath = `${req.protocol}://${results.meta.mimetype.split('/')[0]}.${req.hostname}/${results.path}`
                } else {
                  results.files.images.forEach(image => {
                    image.directpath = `${req.protocol}://${image.meta.mimetype.split('/')[0]}.${req.hostname}/${image.path}`
                  })
                  results.files.audio.forEach(audio => {
                    audio.directpath = `${req.protocol}://${audio.meta.mimetype.split('/')[0]}.${req.hostname}/${audio.path}`
                  })
                  results.files.videos.forEach(video => {
                    video.directpath = `${req.protocol}://${video.meta.mimetype.split('/')[0]}.${req.hostname}/${video.path}`
                  })
                }
                return res.status(200).json(results)
              } else {
                return error(res, 404)
              }
            })
            .catch(err => {
              return error(res, 500)
            })
          case 'u': // User
            return models.file.find({
              "meta.uploaded.by": id
            })
            .lean()
            .exec()
            .then(files => {
              if (files) {
                files.forEach(file => {
                  if (file.meta.type === 'file') {
                    file.directpath = `${req.protocol}://${file.meta.mimetype.split('/')[0]}.${req.hostname}/${file.path}`
                  }
                })
                return models.album.find((id.length > 0 ? {
                  "meta.uploaded.by": id
                } : {}))
                .lean()
                .exec()
                .then(albums => {
                  if (albums) {
                    albums.forEach(album => {
                      album.files.images.forEach(image => {
                        image.directpath = `${req.protocol}://${image.meta.mimetype.split('/')[0]}.${req.hostname}/${image.path}`
                      })
                      album.files.audio.forEach(audio => {
                        audio.directpath = `${req.protocol}://${audio.meta.mimetype.split('/')[0]}.${req.hostname}/${audio.path}`
                      })
                      album.files.videos.forEach(video => {
                        video.directpath = `${req.protocol}://${video.meta.mimetype.split('/')[0]}.${req.hostname}/${video.path}`
                      })
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
      if (typeof userId !== 'object') {
        // We are authorized or auth is disabled
        multer.any()(req, res, err => {
          if (err) {
            return error(res, err.status || 500, err.message)
          } else {
            let files = req.files
            let isAblum = files.length > 1
            let albumId = crypto.randomBytes(config.identifiers.length).toString('hex')
            images = []
            audio = []
            videos = []
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
                path: filename
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
                if (!isAblum) {
                  if (err) {
                    return error(res, 500)
                  } else {
                    file.directpath = `${req.protocol}://${file.meta.mimetype.split('/')[0]}.${req.hostname}/${file.path}`
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
                }
              }
              new models.album(albuminfo)
              .save((err, album) => {
                if (err) {
                  return error(res, 500)
                } else {
                  album.forEach(file => {
                    if (file.meta.type === 'file') {
                      file.directpath = `${req.protocol}://${file.meta.mimetype.split('/')[0]}.${req.hostname}/${file.path}`
                    }
                  })
                  return res.status(200).json(album)
                }
              })
            }
          }
        })
      }
    }
  }
}