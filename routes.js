const fs = require('fs')
const crypto = require('crypto')

function addToUser (config, userId, item) {
  return new Promise((resolve, reject) => {
    if (config.useAuth) {
      let userFile = `${config.uploadDir}/u/${userId}.json`
      new Promise((resolve, reject) => {
        // Create User if not exist
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
          console.log('Saved User Data')
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

module.exports = function (config, multer, app) {

  // FavIcon
  app.get ('/favicon.ico', (req, res) => {
    res.sendFile(`${config.rootDir}/${req.path}`)
  })

  // Index
  app.get ('/', (req, res) => {
    res.sendFile(`${config.rootDir}/${req.path}`)
  })

  // View Image
  app.get('/i/*', (req, res) => {
    console.log(req.path)
    fs.access(`${config.uploadDir}/${req.path}`, fs.constants.R_OK, err => {
      if (err) {
        return res.status(404).json({
            error: 'endpoint/file not found'
        })
      }
      res.sendFile(`${config.uploadDir}/${req.path}`)
    })
  })

  // View Album
  app.get('/a/*', (req, res) => {
    let album = req.path
    if (!album.includes('.json')) {
      album = `${album}.json`
    }
    fs.access(`${config.uploadDir}/${album}`, fs.constants.R_OK, err => {
      if (err) {
        return res.status(404).json({
            error: 'endpoint/file not found'
        })
      }
      if (req.path.includes('.json')) {
        res.sendFile(`${config.uploadDir}/${req.path}`)
      } else {
        res.sendFile(`${config.rootDir}/album.html`)
      }
    })
  })

  // View User
  app.get('/u/*', (req, res) => {
    let user = req.path
    if (!user.includes('.json')) {
      user = `${user}.json`
    }
    fs.access(`${config.uploadDir}/${user}`, fs.constants.R_OK, err => {
      if (err) {
        return res.status(404).json({
            error: 'endpoint/file not found'
        })
      }
      if (req.path.includes('.json')) {
        res.sendFile(`${config.uploadDir}/${req.path}`)
      } else {
        res.sendFile(`${config.rootDir}/user.html`)
      }
    })
  })

  // Upload
  app.post('/upload', multer.any(), async (req, res) => {
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
            let extention = image.originalname.split('.')[1] || 'unknown'
            let id = crypto.randomBytes(5).toString('hex')
            let path = `${id}.${extention}`
            if (!mimetype.includes('image') && !mimetype.includes('video') && !mimetype.includes('audio')) {
              return reject({
                status: 415,
                message: {
                  error: 'Unsupported media type'
                }
              })
            } else {
              fs.writeFile(`${config.uploadDir}/i/${path}`, image.buffer, err => {
                if (err) {
                  return reject({
                    status: 500,
                    message: {
                      error: 'Internal error occurred while writing the image data'
                    }
                  })
                }
                return resolve({path: `/i/${path}`})
              })
            }
          })
        }
      }))
      .then(albumData => {
        if (albumData.length > 0) {
          fs.writeFile(`${config.uploadDir}/a/${albumId}.json`, JSON.stringify(albumData), err => {
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
      let extention = image.originalname.split('.')[1] || 'unknown'
      let id = crypto.randomBytes(5).toString('hex')
      let path = `${id}.${extention}`
      if (!mimetype.includes('image') && !mimetype.includes('video') && !mimetype.includes('audio')) {
        return res.status(415).json({
          error: 'Unsupported media type'
        })
      } else {
        fs.writeFile(`${config.uploadDir}/i/${path}`, image.buffer, err => {
          if (err) {
            return res.status(500).json({
              error: 'Internal error occurred while writing the image data'
            })
          }
          let result = {
            path: `/i/${path}`
          }
          addToUser(config, userId, result)
          return res.status(200).json(result)
        })
      }
    }
  })
}