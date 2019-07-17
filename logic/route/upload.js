const fs = require('fs')
const path = require('path')
const signature = require('stream-signature')

module.exports = (config, app, common, route) => {

  // Handle file/album uploads
  return async function upload (req, res, next) {
    let user = await common.isAuthenticated(req)
    if (user) {
      let uploadState = {
        files: {
          total: 0,
          written: 0,
          removed: 0,
          info: [],
          paths: []
        },
        options: {
          title: 'Album',
          public: true
        },
        album: {
          id: null
        },
        parsed: false,
        complete: false,
        abort: false
      }
      app.console.debug(`[${user.username}] Started upload`)
      req.on('close', async () => {
        if (!uploadState.complete) {
          if (uploadState.files.paths.length > 0) {
            app.console.debug(`[${user.username}] Upload aborted removing ${uploadState.files.paths.length} files`, 'red')
            await common.asyncForEach(uploadState.files.paths, async partial => {
              if (partial.stream !== null) {
                uploadState.abort = true
                partial.stream.end()
              }
              return new Promise((resolve, reject) => {
                fs.unlink(partial.file, () => {
                  uploadState.files.removed += 1
                  return resolve()
                })
              })
            })
            app.console.debug(`${uploadState.files.removed} Files removed`, 'red')
          }
        } else {
          app.console.debug(`[${user.username}] Upload Completed`)
        }
      })
      req.on('process', async () => {
        app.console.debug(`${uploadState.files.total} Files parsed`)
        app.console.debug(`${uploadState.files.written} Files saved`)
        app.console.debug(`Processing ${uploadState.files.written} uploads`)
        if (uploadState.files.total > 1) {
          uploadState.album.id = common.generateID()
          app.console.debug(`Generated album id '${uploadState.album.id}'`)
        }
        await common.asyncForEach(uploadState.files.info, async info => {
          let file = {
            id: info.id,
            meta: {
              thumbnail: (config.upload.thumbnail.enabled ? await common.generateThumbnail(info.destination, info.type) : null),
              filename: path.basename(info.destination),
              originalname: info.originalname,
              mimetype: info.mimetype,
              size: info.size,
              uploaded: {
                by: (typeof user !== null ? user.username : undefined)
              },
              type: info.type
            },
            path: `/f/${info.id}`
          }
          switch (info.type) {
            case 'audio':
              let audiometa = await common.getAudioMeta(info.destination)
              file.meta.song = {
                title: audiometa.title || 'Unknown',
                album: audiometa.album || 'Unknown',
                artist: audiometa.artist || 'Unknown'
              }
            case 'image':
            case 'video':
              if (uploadState.album.id !== null) {
                file.meta.album = uploadState.album.id
              } else {
                file.meta.public = uploadState.options.public
              }
          }
          app.console.debug(`Adding database entry for file '${info.id}'`)
            app.db.models.file.create(file, (err, filedoc) => {
              if (err) {
                app.console.debug(`Unable to add database entry for file '${info.id}'`, 'red')
                return common.error(res, 500)
              } else {
                app.console.debug(`Added database entry for file '${info.id}'`)
                if (uploadState.album.id === null) {
                  return res.status(200).json(common.formatResults(req, filedoc))
                }
              }
            })
        })
        if (uploadState.album.id !== null) {
          let album = {
            id: uploadState.album.id,
            meta: {
              public: uploadState.options.public,
              uploaded: {
                by: (typeof user !== null ? user.username : null)
              },
              title: uploadState.options.title
            },
            path: `/a/${uploadState.album.id}`
          }
          app.console.debug(`Adding database entry for album '${uploadState.album.id}'`)
          app.db.models.album.create(album, (err, albumdoc) => {
            if (err) {
              app.console.debug(`Unable to add database entry for album '${uploadState.album.id}'`, 'red')
              return common.error(res, 500)
            } else {
              app.console.debug(`Added database entry for album '${uploadState.album.id}'`)
              return res.status(200).json(common.formatResults(req, albumdoc))
            }
          })
        }
        uploadState.complete = true
      })

      // Busboy
      req.busboy.on('field', (fieldname, fieldvalue) => {
        if (fieldname === 'options') {
          Object.assign(uploadState.options, JSON.parse(fieldvalue))
          app.console.debug(`Upload options: ${JSON.stringify(uploadState.options, null, 2)}`)
        }
      })
      req.busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
        uploadState.files.total += 1
        let fileinfo = {
          id: common.generateID(),
          type: mimetype.split('/')[0],
          subtype: mimetype.split('/')[1],
          extension: (path.extname(filename) || `.${mimetype.split('/').pop()}`).toLowerCase(),
          fieldname: fieldname,
          originalname: filename,
          mimetype: mimetype,
          encoding: encoding,
          destination: null,
          size: 0
        }
        app.console.debug(`Parsing file: '${filename}' => '${fileinfo.id}'`)
        switch (fileinfo.type) {
          case 'image':
          case 'audio':
          case 'video':
            fileinfo.destination = `${config.storage[fileinfo.type]}/${fileinfo.id}${fileinfo.extension}`
        }
        if (fileinfo.destination !== null) {
          let fstream = fs.createWriteStream(`${fileinfo.destination}`)
          let filetype = new signature()
          uploadState.files.paths.push({
            file: fileinfo.destination,
            stream: fstream
          })
          filetype.on('signature', signature => {
            if (!signature.mimetype.includes(fileinfo.type)) {
              app.console.debug(`Upload of '${fileinfo.id}' rejected file magic is invaild ('${signature.mimetype}')`, 'red')
              req.unpipe(req.busboy)
              req.resume()
              return res.status(415).json({
                file: filename,
                status: 415,
                message: 'invaild filetype'
              })
            }
          })
          fstream.on('close', () => {
            if (!uploadState.abort) {
              uploadState.files.written += 1
              fileinfo.size = fstream.bytesWritten
              uploadState.files.info.push(fileinfo)
              app.console.debug(`Saved file: ${fileinfo.id}`)
              if (uploadState.parsed && uploadState.files.total === uploadState.files.written) {
                req.emit('process')
              }
            }
          })
          file.once('limit', () => {
            app.console.debug(`Upload of '${fileinfo.id}' aborted size limit reached`, 'red')
            /*
              Bug with unpiping causing no response to be returned by the server
              https://github.com/mscdex/busboy/issues/209
            */
            req.unpipe(req.busboy)
            req.resume()
            return res.status(413).json({
              file: 'filename',
              status: 413,
              message: 'file too large'
            })
          })
          file.pipe(filetype).pipe(fstream)
        } else {
          app.console.debug(`Upload of '${fileinfo.id}' aborted invaild filetype`, 'red')
          req.unpipe(req.busboy)
          req.resume()
          return res.status(415).json({
            file: filename,
            status: 415,
            message: 'invaild filetype'
          })
        }
      })
      req.busboy.on('finish', async () => {
        app.console.debug(`Upload parsing complete`)
        uploadState.parsed = true
        if (uploadState.files.total === uploadState.files.written) {
          req.emit('process')
        }
      })
      req.pipe(req.busboy)
    } else {
      return common.error(res, 401)
    }
  }

}