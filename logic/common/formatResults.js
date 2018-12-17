module.exports = (config, app, common) => {

  return function formatResults (req, results) {
    // Change paths to suit current host
    let addPaths = (result, isFile = true) => {
      if (!isFile) {
        result.path = `${req.protocol}://${req.hostname}${result.path}`
      } else {
        let type = result.meta.type
        let subdomain = app.subdomain[type].name
        result.path = `${req.protocol}://${req.hostname}${result.path}`
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
        result.files.forEach(file => {
          addPaths(file)
        })
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