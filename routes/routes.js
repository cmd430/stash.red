module.exports = (config, multer, app) => {

  const logic = require('./logic.js')(config, app, multer)

  // View Index
  app.domain.router.route('/')
    .get(logic.viewPage)
    .put(logic.notImplemented)
    .post(logic.notImplemented)
    .patch(logic.notImplemented)
    .delete(logic.notImplemented)

  // View Album/User/Image/Audio/Video (with HTML wrapper)
  app.domain.router.route('/:type/:id')
  .get(logic.viewPage)
  .put(logic.notImplemented)
  .post(logic.notImplemented)
  .patch(logic.notImplemented)
  .delete(logic.removeItem)

  // Upload File(s)
  app.domain.router.route('/upload')
  .get(logic.notImplemented)
  .put(logic.notImplemented)
  .post(logic.uploadFile)
  .patch(logic.notImplemented)
  .delete(logic.notImplemented)

  // Authkeys
  app.domain.router.route('/auth')
  .get(logic.getAuths)
  .put(logic.addAuth)
  .post(logic.notImplemented)
  .patch(logic.notImplemented)
  .delete(logic.removeAuth)

  // Static Assets
  app.domain.router.route('/*')
  .get(logic.sendAsset)
  .put(logic.notImplemented)
  .post(logic.notImplemented)
  .patch(logic.notImplemented)
  .delete(logic.notImplemented)

  // View Image/Audio/Video (Direct link)
  app.subdomain.image.router.route('/*')
  .get(logic.sendAsset)
  .put(logic.notImplemented)
  .post(logic.notImplemented)
  .patch(logic.notImplemented)
  .delete(logic.notImplemented)

  app.subdomain.audio.router.route('/*')
  .get(logic.sendAsset)
  .put(logic.notImplemented)
  .post(logic.notImplemented)
  .patch(logic.notImplemented)
  .delete(logic.notImplemented)

  app.subdomain.video.router.route('/*')
  .get(logic.sendAsset)
  .put(logic.notImplemented)
  .post(logic.notImplemented)
  .patch(logic.notImplemented)
  .delete(logic.notImplemented)

  // Downloads
  app.subdomain.download.router.route('/:type/:file')
  .get(logic.downloadFile)
  .put(logic.notImplemented)
  .post(logic.notImplemented)
  .patch(logic.notImplemented)
  .delete(logic.notImplemented)

  // Add Admin auth if Applicable
  logic.addAdmin()
}