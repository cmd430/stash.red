const fs = require('fs')
const path = require('path')
const http = require('http')
const https = require('https')
const signature = require('stream-signature')
const sharp = require('sharp')

sharp.cache(false)

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

      // URL Upload or Upload Options
      req.busboy.on('field', (fieldname, fieldvalue) => {
        if (fieldname === 'options') {
          Object.assign(uploadState.options, JSON.parse(fieldvalue))
          app.console.debug(`Upload options: ${JSON.stringify(uploadState.options)}`)
        } else if (fieldname === 'url') {
          if (fieldvalue.startsWith('http')) {
            uploadState.files.total += 1
            let download_uri = fieldvalue
            app.console.debug(`Parsing url: '${download_uri}'`)
            let httpReq = (download_uri.startsWith('https') ? https : http)
            let rstream = httpReq.get(download_uri, response => {
              let filename = response.req.path.split('/')
              filename = filename[filename.length - 1]
              if (response.statusCode === 200) {
                let contentLength = response.headers['content-length'] || 0
                let contentType = response.headers['content-type'].split('/')[0]
                let validContent = [
                  'image',
                  'audio',
                  'video',
                  'application',
                  'binary'
                ]
                if (validContent.includes(contentType)) {
                  if (contentLength <= config.upload.maxsize && contentLength > 0) {
                    let fileinfo = {
                      id: common.generateID(),
                      originalname: `${download_uri}`,
                      destination: null,
                      size: 0
                    }
                    fileinfo.temp_destination = `${config.storage.temp}/${fileinfo.id}`
                    app.console.debug(`Downloading file '${filename}' => '${fileinfo.id}'`)
                    app.console.debug(`Downloading '${fileinfo.id}' 0%`)
                    let received = 0
                    let total = parseInt(response.headers['content-length'], 10)
                    let __current = 0
                    response.on('data', chunk => {
                      received += chunk.length
                      let percent = Math.round(100 * received / total)
                      if (percent !== __current && percent % 10 === 0) {
                        __current = percent
                        app.console.debug(`Downloading '${fileinfo.id}' ${percent}%`)
                        if (percent === 100 && fileinfo.destination === null) {
                          rstream.abort()
                          return res.status(415).json({
                            file: filename,
                            status: 415,
                            message: 'invaild filetype'
                          })
                        }
                      }
                    })
                    let filetype = new signature()
                    let fstream = fs.createWriteStream(`${fileinfo.temp_destination}`)
                    uploadState.files.paths.push({
                      file: fileinfo.temp_destination,
                      stream: fstream
                    })
                    filetype.on('signature', signature => {
                      let mimetype = signature.mimetype
                      let mimetype_parts = mimetype.split('/')
                      fileinfo.type = mimetype_parts[0]
                      fileinfo.subtype = mimetype_parts[1]
                      fileinfo.extension = `.${mimetype_parts[1]}`
                      fileinfo.mimetype = mimetype
                      if (!mimetype_parts[0] === 'image' || !mimetype_parts[0] === 'audio' || !mimetype_parts[0] === 'video') {
                        app.console.debug(`Download of '${fileinfo.id}' rejected file magic is invaild ('${signature.mimetype}')`, 'red')
                        rstream.abort()
                        return res.status(415).json({
                          file: filename,
                          status: 415,
                          message: 'invaild filetype'
                        })
                      } else {
                        // Valid type
                        fileinfo.destination = `${config.storage[fileinfo.type]}/${fileinfo.id}${fileinfo.extension}`
                      }
                    })
                    fstream.on('close', () => {
                      if (!uploadState.abort && fileinfo.destination !== null) {
                        uploadState.files.written += 1
                        fileinfo.size = fstream.bytesWritten
                        uploadState.files.info.push(fileinfo)
                        app.console.debug(`Saved file: ${fileinfo.id}`)
                        if (uploadState.parsed && uploadState.files.total === uploadState.files.written) {
                          req.emit('process')
                        }
                      }
                    })
                    response.pipe(filetype).pipe(fstream)
                  } else {
                    if (contentLength > 0) {
                      app.console.debug(`Upload of '${filename}' aborted size limit reached`, 'red')
                      rstream.abort()
                      return res.status(413).json({
                        file: filename,
                        status: 413,
                        message: 'file too large'
                      })
                    } else {
                      app.console.debug(`Upload of '${filename}' aborted unprocessable entity size `, 'red')
                      rstream.abort()
                      return res.status(413).json({
                        file: filename,
                        status: 422 ,
                        message: 'unprocessable entity'
                      })
                    }
                  }
                } else {
                  app.console.debug(`Upload of '${filename}' aborted invaild filetype`, 'red')
                  rstream.abort()
                  return res.status(415).json({
                    file: filename,
                    status: 415,
                    message: 'invaild filetype'
                  })
                }
              } else {
                app.console.debug(`Invaild url '${download_uri}' aborting `, 'red')
                rstream.abort()
                return res.status(400).json({
                  file: filename,
                  status: 400,
                  message: 'invaild url'
                })
              }
            })
          }
        }
      })

      // File Upload
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
        fileinfo.temp_destination = `${config.storage.temp}/${fileinfo.id}`
        app.console.debug(`Parsing file: '${filename}' => '${fileinfo.id}'`)
        switch (fileinfo.type) {
          case 'image':
          case 'audio':
          case 'video':
            fileinfo.destination = `${config.storage[fileinfo.type]}/${fileinfo.id}${fileinfo.extension}`
        }
        if (fileinfo.destination !== null) {
          let fstream = fs.createWriteStream(`${fileinfo.temp_destination}`)
          let filetype = new signature()
          uploadState.files.paths.push({
            file: fileinfo.temp_destination,
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
            req.unpipe(req.busboy)
            req.resume()
            return res.status(413).json({
              file: filename,
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

      // Complete Upload
      req.on('process', async () => {
        app.console.debug(`${uploadState.files.total} Files parsed`)
        app.console.debug(`${uploadState.files.written} Files saved`)
        app.console.debug(`Processing ${uploadState.files.written} uploads`)
        if (uploadState.files.total > 0) {
          if (uploadState.files.total > 1) {
            uploadState.album.id = common.generateID()
            app.console.debug(`Generated album id '${uploadState.album.id}'`)
          }
          await common.asyncForEach(uploadState.files.info, async info => {
            if (info.type === 'image') {
              await sharp(info.temp_destination)
              .metadata()
              .then(async metadata => {
                if (metadata.orientation !== 0 && metadata.orientation !== undefined) {
                  app.console.debug(`Rotating image '${info.id}'`)
                  await sharp(info.temp_destination)
                  .rotate()
                  .toFile(`${info.temp_destination}_sharp`)
                  .then(() => {
                    return new Promise((resolve, reject) => {
                      app.console.debug(`Rotated image '${info.id}'`)
                      fs.unlink(`${info.temp_destination}`, err => {
                        if (!err) {
                          fs.rename(`${info.temp_destination}_sharp`, info.temp_destination, err => {
                            if (!err) {
                              resolve()
                            } else {
                              reject(err)
                            }
                          })
                        } else {
                          reject(err)
                        }
                      })
                    })
                  })
                }
              })
              .catch(err => {
                fs.unlink(`${info.temp_destination}`, err => {})
                return common.error(res, 500)
              })
            }
            await new Promise((resolve, reject) => {
              app.console.debug(`Moving '${info.id}' to from 'temp' to '${info.type}'`)
              fs.rename(info.temp_destination, info.destination, err => {
                if (!err) {
                  app.console.debug(`Moved '${info.id}' to from 'temp' to '${info.type}'`)
                  resolve()
                } else {
                  reject(err)
                }
              })
            })
            .catch(err => {
              fs.unlink(info.temp_destination, err => {})
              return common.error(res, 500)
            })
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
            return await new Promise((resolve, reject) => {
              app.db.models.file.create(file, (err, filedoc) => {
                if (err) {
                  app.console.debug(`Unable to add database entry for file '${info.id}'`, 'red')
                  return common.error(res, 500)
                } else {
                  app.console.debug(`Added database entry for file '${info.id}'`)
                  if (uploadState.album.id === null) {
                    uploadState.complete = true
                    return res.status(200).json(common.formatResults(req, filedoc))
                  } else {
                    resolve()
                  }
                }
              })
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
            return app.db.models.album.create(album, (err, albumdoc) => {
              if (err) {
                app.console.debug(`Unable to add database entry for album '${uploadState.album.id}'`, 'red')
                return common.error(res, 500)
              } else {
                app.console.debug(`Added database entry for album '${uploadState.album.id}'`)
                uploadState.complete = true
                return res.status(200).json(common.formatResults(req, albumdoc))
              }
            })
          }
        } else {
          uploadState.complete = true
          return res.status(413).json({
            status: 422,
            message: 'unprocessable entity'
          })
        }
      })

      // Done
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
                fs.unlink(partial.file, err => {
                  if (!err) {
                    uploadState.files.removed += 1
                    app.console.debug(`${uploadState.files.removed} Files removed`, 'red')
                  } else {
                    app.console.debug(`File unable to be removed`, 'red')
                  }
                  return resolve()
                })
              })
            })
          } else {
            app.console.debug(`Nothing Uploaded`)
          }
        } else {
          app.console.debug(`[${user.username}] Upload Completed`)
        }
      })

      req.pipe(req.busboy)
    } else {
      return common.error(res, 401)
    }
  }

}