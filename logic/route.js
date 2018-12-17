module.exports = (config, app) => {

  const common = require('./common.js')(config, app)

  module.exports.uploadFile     = require('./route/uploadFile.js')    (config, app, common, module.exports)
  module.exports.downloadFile   = require('./route/downloadFile.js')  (config, app, common, module.exports)
  module.exports.removeItem     = require('./route/removeItem.js')    (config, app, common, module.exports)
  module.exports.removeFile     = require('./route/removeFile.js')    (config, app, common, module.exports)
  module.exports.removeAlbum    = require('./route/removeAlbum.js')   (config, app, common, module.exports)
  module.exports.updateItem     = require('./route/updateItem.js')    (config, app, common, module.exports)
  module.exports.updateFile     = require('./route/updateFile.js')    (config, app, common, module.exports)
  module.exports.updateAlbum    = require('./route/updateAlbum.js')   (config, app, common, module.exports)
  module.exports.getAuths       = require('./route/getAuths.js')      (config, app, common, module.exports)
  module.exports.addAuth        = require('./route/addAuth.js')       (config, app, common, module.exports)
  module.exports.removeAuth     = require('./route/removeAuth.js')    (config, app, common, module.exports)
  module.exports.addAdmin       = require('./route/addAdmin.js')      (config, app, common, module.exports)
  module.exports.sendAsset      = require('./route/sendAsset.js')     (config, app, common, module.exports)
  module.exports.viewPage       = require('./route/viewPage.js')      (config, app, common, module.exports)
  module.exports.notImplemented = require('./route/notImplemented.js')(config, app, common, module.exports)

  return module.exports

}