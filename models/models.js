module.exports = (config, app) => {
  return {
    auth: require('./auth.js')(config, app),
    file: require('./file.js')(config, app),
    album: require('./album.js')(config, app)
  }
}