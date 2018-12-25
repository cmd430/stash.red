
module.exports = (config, app, common, route) => {

  // Generate Capcha
  return app.captcha.generate()

}