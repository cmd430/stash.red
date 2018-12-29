module.exports = (config, app, common, route) => {

  // Forward request to correct function
  return async function removeItem (req, res) {
      let itemType = req.params.type
      if (itemType === 'f') {
        return route.removeFile(req, res)
      } else if (itemType === 'a') {
        return route.removeAlbum(req, res)
      } else if (itemType === 'u') {
        return common.error(res, 401)
      } else {
        return common.error(res, 404)
      }
    }

}