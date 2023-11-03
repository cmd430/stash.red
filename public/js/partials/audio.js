import '../vendor/jsmediatags.min.js'

// eslint-disable-next-line no-undef
const { read } = jsmediatags
const audioPlayers = document.querySelectorAll('audio')

function parseMetadata (url) {
  return new Promise((resolve, reject) => {
    read(url, {
      onSuccess: data => resolve({
        title: data.tags?.title ?? 'Unknown title',
        album: data.tags?.album ?? 'Unknown album',
        artist: data.tags?.artist ?? 'Unknown artist',
        track: data.tags?.track ?? '??',
        type: url.split('.').pop()
      }),
      onError: err => reject(err)
    })
  })
}

for (const audioPlayer of audioPlayers) {
  const audioContainer = audioPlayer.parentElement
  const titleText = audioContainer.querySelector('h1')
  const albumText = audioContainer.querySelector('h2')
  const artistText = audioContainer.querySelector('h3')

  // audioContainer.addEventListener('click', () => (audioPlayer.paused ? audioPlayer.play() : audioPlayer.pause()))

  try {
    const { title, album, artist } = await parseMetadata(audioPlayer.currentSrc)

    titleText.title = title
    albumText.title = album
    artistText.title = artist
    titleText.textContent = title
    albumText.textContent = album
    artistText.textContent = artist
  } catch (err) {
    console.error(err)

    titleText.title = 'Unknown title'
    albumText.title = 'Unknown album'
    artistText.title = 'Unknown artist'
    titleText.textContent = 'Unknown title'
    albumText.textContent = 'Unknown album'
    artistText.textContent = 'Unknown artist'
  }
}
