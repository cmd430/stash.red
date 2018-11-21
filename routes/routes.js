module.exports = (config, multer, app) => {

  const logic = require('./logic.js')(config, app)

  // View Album / User / Image (with HTML wrapper)
  app.domain.get('/:type/:id', logic.viewPage)

  // Static Assets
  app.domain.get('/', logic.sendAsset)
  app.subdomain.image.get('/*', logic.sendAsset)
  app.subdomain.audio.get('/*', logic.sendAsset)
  app.subdomain.video.get('/*', logic.sendAsset)
  app.subdomain.static.get('/*', logic.sendAsset)

  // Upload File
  app.domain.post('/upload', multer.any(), logic.uploadFile)

}