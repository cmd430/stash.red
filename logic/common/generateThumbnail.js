const path = require('path')
const ffmpeg = require('ffmpeg-static')
const simpleThumbnail = require('simple-thumbnail')
const jsmediatags = require('jsmediatags')
const sharp = require('sharp')

sharp.cache(false)

module.exports = (config, app, common) => {

  return async function generateThumbnail (file, type) {
    let id = path.parse(file).name
    app.console.debug(`Generating thumbnail for '${id}'`)
    return new Promise((resolve, reject) => {
      switch (type) {
        case 'image':
          return resolve(file)
        case 'video':
          return simpleThumbnail(file, null, '100%', {
            path: ffmpeg.path,
            seek: '00:00:01.00'
          })
          .then(stream => {
            let buffer = []
            stream.on('data', data => {
              buffer.push(data)
            })
            stream.on('end', () => {
              return resolve(Buffer.concat(buffer))
            })
            stream.on('error', err => {
              return reject(err)
            })
          })
        case 'audio':
          return new jsmediatags.Reader(file)
          .setTagsToRead([
            'picture'
          ])
          .read({
            onSuccess: data => {
              let picture = data.tags.picture
              if (picture === undefined){
                return reject({
                  message: 'no picute data'
                })
              }
              return resolve(Buffer.from(picture.data))
            },
            onError: err => {
              return reject(err)
            }
          })
      }
    })
    .then(buffer => {
      app.console.debug(`Scaling thumbnail for '${id}'`)
      return sharp(buffer)
      .resize({
        width: config.upload.thumbnail.size,
        height: config.upload.thumbnail.size,
        fit: config.upload.thumbnail.fit,
        position: config.upload.thumbnail.position,
        background: config.upload.thumbnail.background,
        kernel: config.upload.thumbnail.kernel,
        withoutEnlargement: config.upload.thumbnail.withoutEnlargement
      })
      .webp({
        quality: config.upload.thumbnail.quaility
      })
      .toBuffer()
    })
    .then(thumbnail => {
      app.console.debug(`Generated thumbnail for '${id}'`)
      return `data:image/webp;base64,${thumbnail.toString('base64')}`
    })
    .catch(err => {
      app.console.debug(`Unable to generate thumbnail for '${id}'`, 'red')
      app.console.debug(err, 'red')
      return null
    })
  }

}