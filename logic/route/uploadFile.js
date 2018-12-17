const fs = require('fs')
const path = require('path')
const sharp = require('sharp')
const meter = require('stream-meter')

module.exports = (config, app, common, route) => {

  // Handle file uploads
  return async function uploadFile (req, res) {
    let user = await common.auth(req, res)
    if (user !== false) {
      // We are authorized
      // or auth is disabled
      req.pipe(req.busboy)
      let files = []
      let partial = {}
      let finished = false
      req.on('close', () => {
        if (!finished) {
          if (partial.path) {
            partial.stream.close()
            fs.unlink(partial.path, () => {})
          }
          files.forEach(file => {
            fs.unlink(file.path, () => {
              // Remove DB entries (if any)
            })
          })
        }
      })
      req.busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
        let aborted = false
        let errored = false
        partial = {}
        let fileinfo = {
          fieldname: fieldname,
          originalname: filename,
          mimetype: mimetype,
          encoding: encoding
        }
        app.console.debug(`Upload of '${filename}' started`)
        let shorttype = mimetype.split('/')[0]
        let extention = path.extname(fileinfo.originalname) || `.${mimetype.split('/').pop()}`
        let id = common.generateID()
        app.console.debug(`ID Generated for '${filename}' => '${id}'`)
        let filepath = `${id}${extention}`
        let destination = null
        switch (shorttype) {
          case 'image':
          case 'audio':
          case 'video':
            destination = `${config.storage[shorttype]}/${filepath}`
        }
        if (destination === null) {
          app.console.debug(`Upload of '${filename}' aborted invaild filetype`)
          return file.resume()
        }
        let fstream = fs.createWriteStream(destination)
        let size = meter()
        if (shorttype === 'image') {
          file.pipe(size).pipe(sharp().rotate()).pipe(fstream)
        } else {
          file.pipe(size).pipe(fstream)
        }
        file.on('data', () => {
          partial = {
            stream: fstream,
            path: destination
          }
        })
        file.on('limit', () => {
          aborted = true
          fs.unlink(destination, () => {
            file.resume()
          })
        })
        fstream.on('error', () => {
          errored = true
          fs.unlink(destination, () => {
            file.resume()
          })
        })
        file.on('end', async () => {
          if (aborted) {
            app.console.debug(`Upload of '${filename}' aborted size limit reached`)
          } else if (errored) {
            app.console.debug(`Upload of '${filename}' aborted due to error`)
          } else {
            app.console.debug(`Upload of '${filename}' finished`)
            fileinfo.path = destination
            fileinfo.destination = path.dirname(destination)
            fileinfo.filename = filepath
            fileinfo.size = size.bytes
            files.push(fileinfo)
          }
        })
      })
      req.busboy.on('finish', async () => {
        finished = true
        if (files.length > 0) {
          let albumId = null
          if (files.length > 1) {
            albumId = common.generateID()
            app.console.debug(`Generated album ID '${albumId}'`)
          }
          let filesinfo = []
          await common.asyncForEach(files, async file => {
            let filename = path.basename(file.path)
            let extension = path.extname(filename)
            let fileID = path.basename(filename, extension)
            let mimetype = file.mimetype
            let shorttype = mimetype.split('/')[0]
            let thumbnail = null
            if (config.upload.thumbnail.enabled) {
              thumbnail = await common.generateThumbnail(file.path, shorttype)
            }
            let fileinfo = {
              id: fileID,
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
              path: `/f/${fileID}`
            }
            switch (shorttype) {
              case 'audio':
                let audioMeta = await common.getAudioMeta(file.path)
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
            app.console.debug(`Adding database entry for file '${filename}'`)
            new app.db.models.file(fileinfo)
            .save((err, file) => {
              if (err) {
                app.console.debug(`Unable to add database entry for file '${filename}'`)
                return common.error(res, 500)
              } else {
                app.console.debug(`Added database entry for file '${filename}'`)
                if (!albumId) {
                  return res.status(200).json(common.formatResults(req, file))
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
            app.console.debug(`Adding database entry for album '${albumId}'`)
            new app.db.models.album(albuminfo)
            .save((err, album) => {
              if (err) {
                app.console.debug(`Unable to add database entry for album '${albumId}'`)
                return common.error(res, 500)
              } else {
                app.console.debug(`Added database entry for album '${albumId}'`)
                album.files = filesinfo
                return res.status(200).json(common.formatResults(req, album))
              }
            })
          }
        } else {
          return common.error(res, 500)
        }
      })
    } else {
      return common.error(res, 401)
    }
  }

}