const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const mime = require('mime-types')

/*
  Route Functions
 =======================*/
module.exports = function (config, multer) {
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
        file = `${config.storage.files.image}/${file}`
      } else if (subdomains.includes('audio')) {
        file = `${config.storage.files.audio}/${file}`
      } else if (subdomains.includes('video')) {
        file = `${config.storage.files.video}/${file}`
      } else {
        file = `${config.storage.static}/${file}`
      }
      return fileExists(res, file, () => {
        return res.sendFile(`${file}`)
      })
    },

    // View Album / User Page | View Album / User JSON
    viewPage: async function (req, res) {
      let page = req.path
      if (page.includes('.json')) {
        let file = `${page}`
        if (page.includes('/u/')) {
          file = `${config.storage.users}${file.substring(2)}`
        } else if (page.includes('/a/')) {
          file = `${config.storage.albums}${file.substring(2)}`
        }
        return fileExists(res, file, () => {
          return res.sendFile(`${file}`)
        })
      } else {
        if (page.includes('/u/')) {
          return res.sendFile(`${config.storage.static}/user.html`)
        } else if (page.includes('/a/')) {
          return res.sendFile(`${config.storage.static}/album.html`)
        } else if (page.includes('/f/')) {
          let mimetype = mime.lookup(`${page}`) || []
          if (mimetype.includes('image')) {
            return res.sendFile(`${config.storage.static}/image.html`)
          } else if (mimetype.includes('audio')) {
            return res.sendFile(`${config.storage.static}/audio.html`)
          } else if (mimetype.includes('video')) {
            return  res.sendFile(`${config.storage.static}/video.html`)
          } else {
            return error(res, 404)
          }
        }
      }
    },

    // Upload File
    uploadFile: async function (req, res) {
      //
      // TODO
      //  clean this mother fucker up
      //  change to custom multer storage engine
      //  so we can use pipe() and create thumbnails
      //  and maybe in the future add a compression
      //  option to uploads
      //
      //  https://github.com/expressjs/multer/blob/master/StorageEngine.md
      //
      let userId
      if (config.useAuth) {
        if (!req.headers['authorization'] || !config.authKeys.includes(req.headers['authorization'])) {
          return res.status(401).json({
            error: 'Unauthorized'
          })
        }
        userId = req.headers['authorization']
      }
      if (req.files.length > 1) {
        let albumId = crypto.randomBytes(5).toString('hex')
        return Promise.all(req.files.map(image => {
          if (image !== 'undefined') {
            return new Promise((resolve, reject) => {
              let mimetype = image.mimetype
              let extention = path.extname(image.originalname) || `.${mimetype.split('/').pop()}`
              let id = crypto.randomBytes(5).toString('hex')
              let imgpath = `${id}${extention}`
              if (!mimetype.includes('image') && !mimetype.includes('video') && !mimetype.includes('audio')) {
                return reject({
                  status: 415,
                  message: {
                    error: 'Unsupported media type'
                  }
                })
              } else {
                fs.writeFile(`${config.storage.files[mimetype.split('/')[0]]}/${imgpath}`, image.buffer, err => {
                  if (err) {
                    return reject({
                      status: 500,
                      message: {
                        error: 'Internal error occurred while writing the image data'
                      }
                    })
                  }
                  return resolve({
                    path: `/f/${imgpath}`,
                    direct: `${imgpath}`,
                    type: mimetype.split('/')[0]
                  })
                })
              }
            })
          }
        }))
        .then(albumData => {
          if (albumData.length > 0) {
            fs.writeFile(`${config.storage.albums}/${albumId}.json`, JSON.stringify(albumData), err => {
              if (err) {
                return res.status(500).json({
                  error: 'Internal error occurred while writing the album data'
                })
              }
              let result = {
                path: `/a/${albumId}`
              }
              addToUser(config, userId, result)
              return res.status(200).json(result)
            })
          }
        })
        .catch(err => {
          return res.status(err.status).json(err.message)
        })
      } else {
        let image = req.files[0]
        let mimetype = image.mimetype
        let extention = path.extname(image.originalname) || `.${mimetype.split('/').pop()}`
        let id = crypto.randomBytes(5).toString('hex')
        let imgpath = `${id}${extention}`
        if (!mimetype.includes('image') && !mimetype.includes('video') && !mimetype.includes('audio')) {
          return res.status(415).json({
            error: 'Unsupported media type'
          })
        } else {
          fs.writeFile(`${config.storage.files[mimetype.split('/')[0]]}/${imgpath}`, image.buffer, err => {
            if (err) {
              console.log(err)
              return res.status(500).json({
                error: 'Internal error occurred while writing the image data'
              })
            }
            let result = {
              path: `/f/${id}`,
              direct: `${imgpath}`,
              type: mimetype.split('/')[0]
            }
            addToUser(config, userId, result)
            return res.status(200).json(result)
          })
        }
      }
    }

  }
}


/*
  Shared Functions
=======================*/

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

function fileExists (res, filepath, callback) {
  return fs.access(`${filepath}`, fs.constants.R_OK, err => {
    if (err) {
      return error(res, 404)
    } else {
      callback()
    }
  })
}

function addToUser (config, userId, item) {

  //
  // TODO
  //  clean this mother fucker up
  //  and add proper error handling
  //

  return new Promise((resolve, reject) => {
    if (config.useAuth) {
      let userFile = `${config.storage.users}/${userId}.json`
      new Promise((resolve, reject) => {
        // Create User file if not exist
        // we dont need to worry about junk
        // users becasue we can only get to this
        // function if we passed the auth
        // test already!
        fs.writeFile(userFile, JSON.stringify([]), {
          flag: 'wx'
        }, err => {
          return resolve()
        })
      })
      .then(() => {
        return new Promise((resolve, reject) => {
          return fs.readFile(userFile, (err, data) => {
            return resolve(data)
          })
        })
      })
      .then(data => {
        userData = JSON.parse(data)
        userData.push(item)
        fs.writeFile(userFile, JSON.stringify(userData), err => {
          if (err) {
            // Hurr Durr swallow the error
          }
          return resolve()
        })
      })
      .catch(err => {
        // Hurr Durr swallow the error
        return resolve()
      })
    }
  })
}