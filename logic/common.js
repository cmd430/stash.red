module.exports = (config, app) => {

  module.exports.asyncForEach      = require('./common/asyncForEach.js')     (config, app, module.exports)
  module.exports.auth              = require('./common/auth.js')             (config, app, module.exports)
  module.exports.error             = require('./common/error.js')            (config, app, module.exports)
  module.exports.fileExists        = require('./common/fileExists.js')       (config, app, module.exports)
  module.exports.formatResults     = require('./common/formatResults.js')    (config, app, module.exports)
  module.exports.generateID        = require('./common/generateID.js')       (config, app, module.exports)
  module.exports.generateThumbnail = require('./common/generateThumbnail.js')(config, app, module.exports)
  module.exports.getAudioMeta      = require('./common/getAudioMeta.js')     (config, app, module.exports)
  module.exports.getDBAlbum        = require('./common/getDBAlbum.js')       (config, app, module.exports)
  module.exports.getDBFile         = require('./common/getDBFile.js')        (config, app, module.exports)
  module.exports.getDBUser         = require('./common/getDBUser.js')        (config, app, module.exports)
  module.exports.queryDB           = require('./common/queryDB.js')          (config, app, module.exports)

  return module.exports

}