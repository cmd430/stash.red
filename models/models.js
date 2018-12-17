module.exports = (app) => {
  return {
    auth: require('./auth.js')(app),
    file: require('./file.js')(app),
    album: require('./album.js')(app)
  }
}