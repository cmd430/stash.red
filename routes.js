const fs = require('fs')
const crypto = require('crypto')

module.exports = function (config, multer, app) {

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

  // Upload
  app.post('/upload', multer.any(), async (req, res) => {
    if (config.useAuth) {
      if (!req.headers['authorization'] || !config.authKeys.includes(req.headers['authorization'])) {
        return res.status(401).json({
          error: 'Unauthorized'
        })
      }
    }
    if (req.files.length > 1) {
      let albumId = crypto.randomBytes(5).toString('hex')
      return Promise.all(req.files.map(image => {
        if (image !== 'undefined') {
          return new Promise((resolve, reject) => {
            let mimetype = image.mimetype
            let extention = image.originalname.split('.')[1] || 'png'
            let id = crypto.randomBytes(5).toString('hex')
            let path = `${id}.${extention}`
            if (!mimetype.includes('image')) {
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
            return res.status(200).json({
              path: `/a/${albumId}`
            })
          })
        }
      })
      .catch(err => {
        return res.status(err.status).json(err.message)
      })
    } else {
      let image = req.files[0]
      let mimetype = image.mimetype
      let extention = image.originalname.split('.')[1] || 'png'
      let id = crypto.randomBytes(5).toString('hex')
      let path = `${id}.${extention}`
      if (!mimetype.includes('image')) {
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
          return res.status(200).json({
            path: `/i/${path}`
          })
        })
      }
    }
  })
}