module.exports = (config, app, common, route) => {

  // Forward request to correct function
  return async function updateItem (req, res) {
    let itemType = req.params.type
    if (itemType === 'f') {
      return route.updateFile(req, res)
    } else if (itemType === 'a') {
      return route.updateAlbum(req, res)
    } else if (itemType === 'u') {
      return route.notImplemented(req, res)
    } else {
      return common.error(res, 404)
    }
  }

}