const fs = require('fs')
const path = require('path')
const signature = require('stream-signature')

module.exports = (config, app, common, route) => {

  // Handle file/album uploads
  return async function upload (req, res, next) {
    let user = await common.isAuthenticated(req)
    if (user) {
      // We are authorized
      req.pipe(req.busboy)
      let files = []
      let partial = {}
      let finished = false
      let errors = []
      req.on('close', () => {
        if (!finished && partial.path) {
          app.console.debug(`Upload aborted removing files`, 'red')
          partial.stream.close()
          fs.unlink(partial.path, () => {
            app.console.debug(`Removed partial file '${path.basename(partial.path)}'`)
          })
          files.forEach(file => {
            fs.unlink(file.path, () => {
              app.console.debug(`Removed file '${path.basename(partial.path)}'`)
            })
          })
        }
      })
      req.busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
        let aborted = false
        let errored = false
        let invailid = false
        partial = {}
        let fileinfo = {
          fieldname: fieldname,
          originalname: filename,
          mimetype: mimetype,
          encoding: encoding
        }
        app.console.debug(`'${user.username}' Started upload of '${filename}'`)
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
          app.console.debug(`Upload of '${filename}' aborted invaild filetype, file removed`, 'red')
          errors.push({
            file: filename,
            status: 415,
            message: 'invaild filetype'
          })
          return file.resume()
        }
        let fstream = fs.createWriteStream(destination)
        fstream.on('error', () => {
          errored = true
          file.resume()
          fs.unlink(destination, () => {
            partial = {}
          })
        })
        let type = new signature()
        type.on('signature', signature => {
          if (!signature.mimetype.includes(shorttype)) {
            invailid = signature.mimetype
            // This is a hack using a Dicer private method
            // but its the only way to stop reading bytes
            // without stalling busboy...
            req.busboy._parser.parser._ignore()
            fstream.end()
            fs.unlink(destination, () => {
              partial = {}
              file.emit('end')
            })
          }
        })

        file.pipe(type).pipe(fstream)

        file.once('data', () => {
          partial = {
            stream: fstream,
            path: destination
          }
        })
        file.on('limit', () => {
          aborted = true
          fstream.end()
          fs.unlink(destination, () => {
            partial = {}
            file.emit('end')
          })
        })
        file.on('end', async () => {
          if (invailid) {
            app.console.debug(`Upload of '${filename}' rejected file magic is invaild ('${invailid}'), file removed`, 'red')
            errors.push({
              file: filename,
              status: 415,
              message: 'invaild filetype'
            })
          } else if (aborted) {
            app.console.debug(`Upload of '${filename}' aborted size limit reached, file removed`, 'red')
            errors.push({
              file: filename,
              status: 413,
              message: 'file too large'
            })
          } else if (errored) {
            app.console.debug(`Upload of '${filename}' aborted due to write error, file removed`, 'red')
            errors.push({
              file: filename,
              status: 500,
              message: 'error writing file'
            })
          } else {
            app.console.debug(`Upload of '${filename}' finished`)
            fileinfo.path = destination
            fileinfo.destination = path.dirname(destination)
            fileinfo.filename = filepath
            fileinfo.size = fstream.bytesWritten
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
            let fileinfo = {
              id: fileID,
              meta: {
                thumbnail: (config.upload.thumbnail.enabled ? await common.generateThumbnail(file.path, shorttype) : null),
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
            app.db.models.file.create(fileinfo, (err, file) => {
              if (err) {
                app.console.debug(`Unable to add database entry for file '${filename}'`, 'red')
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
            app.db.models.album.create(albuminfo, (err, album) => {
              if (err) {
                app.console.debug(`Unable to add database entry for album '${albumId}'`, 'red')
                return common.error(res, 500)
              } else {
                app.console.debug(`Added database entry for album '${albumId}'`)
                album.files = filesinfo
                return res.status(200).json(common.formatResults(req, album))
              }
            })
          }
        } else {
          if (errors.length > 1) {
            return common.error(res, 422)
          }
          return res.status(errors[0].status).json(errors[0])
        }
      })
    } else {
      return common.error(res, 401)
    }
  }

}