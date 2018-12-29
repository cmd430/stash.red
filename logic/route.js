module.exports = (config, app) => {

  const common = require('./common.js')(config, app)

  module.exports.signup          = require('./route/user/signup.js')         (config, app, common, module.exports)
  module.exports.login           = require('./route/user/login.js')          (config, app, common, module.exports)
  module.exports.logout          = require('./route/user/logout.js')         (config, app, common, module.exports)
  module.exports.generateCaptcha = require('./route/user/generateCaptcha.js')(config, app, common, module.exports)

  module.exports.upload          = require('./route/upload.js')              (config, app, common, module.exports)
  module.exports.download        = require('./route/download.js')            (config, app, common, module.exports)

  module.exports.removeItem      = require('./route/remove/removeItem.js')   (config, app, common, module.exports)
  module.exports.removeFile      = require('./route/remove/removeFile.js')   (config, app, common, module.exports)
  module.exports.removeAlbum     = require('./route/remove/removeAlbum.js')  (config, app, common, module.exports)

  module.exports.updateItem      = require('./route/update/updateItem.js')   (config, app, common, module.exports)
  module.exports.updateFile      = require('./route/update/updateFile.js')   (config, app, common, module.exports)
  module.exports.updateAlbum     = require('./route/update/updateAlbum.js')  (config, app, common, module.exports)

  module.exports.sendAsset       = require('./route/view/sendAsset.js')      (config, app, common, module.exports)
  module.exports.viewPage        = require('./route/view/viewPage.js')       (config, app, common, module.exports)
  module.exports.notImplemented  = require('./route/notImplemented.js')      (config, app, common, module.exports)

  return module.exports

}