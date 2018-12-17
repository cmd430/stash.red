module.exports = (config, app, common, route) => {

  // Send Asset Files
  return async function sendAsset (req, res) {
    let file = req.path
    if (file.includes('favicon.ico')) {
      file = `${config.storage.asset}/img/${file}`
    } else {
      let subdomains = req.subdomains
      if (file.includes('.html') || file === '/') {
        // We only want to serve image/audio/video files
        // from the subdomains, so we redirect html
        // requests back to the host domain
        return res.redirect(`${req.protocol}://${req.hostname.match(/[^\.]*\.[^.]*$/)[0]}/`)
      }
      if (subdomains.includes(`${app.subdomain.image.name}`)) {
        file = `${config.storage.image}${file}`
      } else if (subdomains.includes(`${app.subdomain.audio.name}`)) {
        file = `${config.storage.audio}${file}`
      } else if (subdomains.includes(`${app.subdomain.video.name}`)) {
        file = `${config.storage.video}${file}`
      } else {
        file = `${config.storage.asset}${file}`
      }
    }
    return common.fileExists(res, file, () => {
      return res.status(200).sendFile(`${file}`)
    })
  }

}