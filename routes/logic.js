const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

/*
  Route Functions
 =======================*/
module.exports = function (config, app) {

  const models = require('./models.js')(app)
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
        return res.sendFile(`${file}`)
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
          case 'u': // User
            return models[typeLong].findOne({
                id: id
              })
            .exec()
            .then(doc => {
              if (Array.isArray(docs)) {
                return res.json(doc[0])
              } else {
                return error(res, 404)
              }
            })
            .catch(err => {
              return error(res, 404)
            })
          default: // Error
            return error(res, 404)
        }
      } else {
        switch (type) {
          case 'f': // File
          case 'a': // Album
          case 'u': // User
            return res.sendFile(`${config.storage.static}/${typeLong}.html`)
          default: // Error
            return error(res, 404)
        }
      }
    },

    // Upload File
    uploadFile: async function (req, res) {
      //
      // TODO
      //  clean this mother fucker up
      //  write data to mongo
      //
      let userId
      if (config.auth.enabled) {
        if (!req.headers['authorization'] || !await authTest(models, req.headers['authorization'])) {
          return error(res, 401)
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
                fs.writeFile(`${config.storage[mimetype.split('/')[0]]}/${imgpath}`, image.buffer, err => {
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
        console.log(image)
        let mimetype = image.mimetype
        let extention = path.extname(image.originalname) || `.${mimetype.split('/').pop()}`
        let id = crypto.randomBytes(5).toString('hex')
        let imgpath = `${id}${extention}`
        if (!mimetype.includes('image') && !mimetype.includes('video') && !mimetype.includes('audio')) {
          return res.status(415).json({
            error: 'Unsupported media type'
          })
        } else {
          fs.writeFile(`${config.storage[mimetype.split('/')[0]]}/${imgpath}`, image.buffer, err => {
            if (err) {
              console.log(err)
              return res.status(500).json({
                error: 'Internal error occurred while writing the image data'
              })
            }
            let result = {
              path: `/f/${imgpath}`,
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

async function authTest(models, key) {
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
}

async function addToUser (config, userId, item) {

  //
  // TODO
  //  clean this mother fucker up
  //  and add proper error handling
  //

  return new Promise((resolve, reject) => {
    if (config.auth.enabled) {
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