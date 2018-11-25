module.exports = (config, multer, app) => {

  const logic = require('./logic.js')(config, app, multer)

  // View Album / User / Image (with HTML wrapper)
  app.domain.get('/:type/:id', logic.viewPage)

  // Authkeys
  app.domain.get('/auth', logic.getAuths)
  app.domain.put('/auth', logic.addAuth)
  app.domain.delete('/auth', logic.removeAuth)

  // Static Assets
  app.domain.get('/*', logic.sendAsset)
  app.subdomain.image.get('/*', logic.sendAsset)
  app.subdomain.audio.get('/*', logic.sendAsset)
  app.subdomain.video.get('/*', logic.sendAsset)
  app.subdomain.static.get('/*', logic.sendAsset)

  // Upload File
  app.domain.post('/upload', logic.uploadFile)

  // Add Admin auth if Applicable
  logic.addAdmin()
}