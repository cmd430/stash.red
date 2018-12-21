module.exports = (config, app) => {

  const route = require('./logic/route.js')(config, app)

  // View Index
  app.domain.router.route('/')
  .get(route.viewPage)
  .put(route.notImplemented)
  .post(route.notImplemented)
  .patch(route.notImplemented)
  .delete(route.notImplemented)

  // Login / Sign Up / Logout / Profile
  app.domain.router.route('/login')
  .get(route.viewPage)
  .put(route.notImplemented)
  .post(route.login)
  .patch(route.notImplemented)
  .delete(route.notImplemented)

  app.domain.router.route('/signup')
  .get(route.viewPage)
  .put(route.notImplemented)
  .post(route.signup)
  .patch(route.notImplemented)
  .delete(route.notImplemented)

  app.domain.router.route('/logout')
  .get(route.logout)
  .put(route.notImplemented)
  .post(route.notImplemented)
  .patch(route.notImplemented)
  .delete(route.notImplemented)

  // Upload File(s)
  app.domain.router.route('/upload')
  .get(route.notImplemented)
  .put(route.notImplemented)
  .post(route.uploadFile)
  .patch(route.notImplemented)
  .delete(route.notImplemented)

  // View Album/User/Image/Audio/Video (with HTML wrapper)
  app.domain.router.route('/:type/:id')
  .get(route.viewPage)
  .put(route.notImplemented)
  .post(route.notImplemented)
  .patch(route.updateItem)
  .delete(route.removeItem)

  // Static Assets
  app.domain.router.route('/*')
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

}