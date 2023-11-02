const videoPlayers = document.querySelectorAll('video')

for (const videoPlayer of videoPlayers) {

  videoPlayer.addEventListener('loadedmetadata', () => videoPlayer.removeAttribute('style'))
  videoPlayer.addEventListener('ended', () => {
    const { width, height } = getComputedStyle(videoPlayer)

    videoPlayer.setAttribute('style', `width: ${width}; height: ${height}`) // preserve size when reloading
    videoPlayer.load()
  })
}
