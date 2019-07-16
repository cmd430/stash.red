module.exports = (config, app) => {

  const route = require('./logic/route.js')(config, app)

  // View Index
  app.domain.router.route('/')
  .get(route.viewPage)

  // Login / Sign Up / Logout / Captcha
  app.domain.router.route('/login')
  .get(route.viewPage)
  .post(route.login)

  app.domain.router.route('/signup')
  .get(route.viewPage)
  .post(route.signup)

  app.domain.router.route('/logout')
  .get(route.logout)

  app.domain.router.route('/captcha')
  .get(route.generateCaptcha)

  // Upload File(s)
  app.domain.router.route('/upload')
  .post(route.upload)

  // View Album/User/Image/Audio/Video (with HTML wrapper)
  app.domain.router.route('/:type/:id')
  .get(route.viewPage)
  .patch(route.updateItem)
  .delete(route.removeItem)

  // Static Assets
  app.domain.router.route('/*')
  .get(route.sendAsset)

  // Downloads
  app.subdomain.download.router.route('/:type/:download')
  .get(route.download)

  // View Image/Audio/Video (Direct link)
  app.subdomain.image.router.route('/*')
  .get(route.sendAsset)

  app.subdomain.audio.router.route('/*')
  .get(route.sendAsset)

  app.subdomain.video.router.route('/*')
  .get(route.sendAsset)

  // Method not Implemented - handels all routes
  app.domain.router.route('*')
  .all(route.notImplemented)

}