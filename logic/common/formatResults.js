const path = require('path')

module.exports = (config, app, common) => {

  return function formatResults (req, results) {
    // Change paths to suit current host
    let addPaths = (result, isFile = true) => {
      let type = result.meta.type
      result.path = `${req.protocol}://${req.hostname}${result.path}`
      if (result.meta.thumbnail === null) {
        // We dont want thumbnails if not on
        // use pages so no point setting it if
        // it wasnt returned at all from the DB
        result.meta.thumbnail = `${req.protocol}://${req.hostname}/img/generic_${type}.png`
      }
      if (isFile) {
        let subdomain = app.subdomain[type].name
        if (type === 'audio') {
          // Hopfully this will stop any songs
          // titled 'Unknown' from incorrectly
          // using filename
          if (result.meta.song.title === 'Unknown' && result.meta.song.artist === 'Unknown') {
            // Use filename for audio missing title
            result.meta.song.title = path.parse(result.meta.originalname).name
          }
          // add missing art
          if (result.meta.song.artwork === null) {
            result.meta.song.artwork = `${req.protocol}://${req.hostname}/img/generic_${type}.png`
          }
        }
        result.directpath = `${req.protocol}://${subdomain}.${req.hostname}/${result.meta.filename}`
        result.downloadpath = `${req.protocol}://${app.subdomain.download.name}.${req.hostname}/${type}/${result.meta.filename}`
      }
    }
    let format = result => {
      if (result.meta.type === 'album') {
        addPaths(result, false)
        if (result.meta.title === null) {
          result.meta.title = 'Album'
        }
        if (result.files) {
          result.files.forEach(file => {
            addPaths(file)
          })
        }
      } else if (result.meta.type === 'user') {
        addPaths(result, false)
        result.files.forEach(file => {
          addPaths(file)
        })
        result.albums.forEach(album => {
          format(album)
        })
      } else {
        addPaths(result)
      }
    }
    if (Array.isArray(results)) {
      results.forEach(result => {
        format(result)
      })
    } else {
      format(results)
    }
    return results
  }

}