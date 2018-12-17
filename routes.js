module.exports = (config, app) => {

  const route = require('./logic/route.js')(config, app)

  // View Index
  app.domain.router.route('/')
  .get(route.viewPage)
  .put(route.notImplemented)
  .post(route.notImplemented)
  .patch(route.notImplemented)
  .delete(route.notImplemented)

  // View Album/User/Image/Audio/Video (with HTML wrapper)
  app.domain.router.route('/:type/:id')
  .get(route.viewPage)
  .put(route.notImplemented)
  .post(route.notImplemented)
  .patch(route.updateItem)
  .delete(route.removeItem)

  // Upload File(s)
  app.domain.router.route('/upload')
  .get(route.notImplemented)
  .put(route.notImplemented)
  .post(route.uploadFile)
  .patch(route.notImplemented)
  .delete(route.notImplemented)

  // Authkeys
  app.domain.router.route('/auth')
  .get(route.getAuths)
  .put(route.addAuth)
  .post(route.notImplemented)
  .patch(route.notImplemented)
  .delete(route.removeAuth)

  // Static Assets
  app.domain.router.route('/*')
  .get(route.sendAsset)
  .put(route.notImplemented)
  .post(route.notImplemented)
  .patch(route.notImplemented)
  .delete(route.notImplemented)

  // View Image/Audio/Video (Direct link)
  app.subdomain.image.router.route('/*')
  .get(route.sendAsset)
  .put(route.notImplemented)
  .post(route.notImplemented)
  .patch(route.notImplemented)
  .delete(route.notImplemented)

  app.subdomain.audio.router.route('/*')
  .get(route.sendAsset)
  .put(route.notImplemented)
  .post(route.notImplemented)
  .patch(route.notImplemented)
  .delete(route.notImplemented)

  app.subdomain.video.router.route('/*')
  .get(route.sendAsset)
  .put(route.notImplemented)
  .post(route.notImplemented)
  .patch(route.notImplemented)
  .delete(route.notImplemented)

  // Downloads
  app.subdomain.download.router.route('/:type/:file')
  .get(route.downloadFile)
  .put(route.notImplemented)
  .post(route.notImplemented)
  .patch(route.notImplemented)
  .delete(route.notImplemented)

  // Add Admin auth if Applicable
  route.addAdmin()
}