const path = require('path')
const jsmediatags = require('jsmediatags')

module.exports = (config, app, common) => {

  return async function getAudioMeta (file) {
    app.console.debug(`Processing audio meta for file: ${path.basename(file)}`)
    return new Promise((resolve, reject) => {
      return new jsmediatags.Reader(file)
      .setTagsToRead([
        'title',
        'album',
        'artist'
      ])
      .read({
        onSuccess: meta => {
          app.console.debug(`Processed audio meta for file: ${path.basename(file)}`)
          return resolve(meta.tags)
        },
        onError: err => {
          app.console.debug(`Unable to process audio meta for file: ${path.basename(file)}`)
          return reject(null)
        }
      })
    })
  }

}