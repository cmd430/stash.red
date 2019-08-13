document.addEventListener('DOMContentLoaded', () => {
  for (let i = 0; i < 5; i++) {
    // Add 5 spacers to make the grid (its flex)
    // look nice on non full rows
    let spacer = document.createElement('div')
    spacer.classList.add('spacer')
    document.querySelector('#container').insertBefore(spacer, document.querySelector('.pagination'))
  }

  document.querySelectorAll('.thumbnail').forEach(thumb => {
    thumb.addEventListener('error', e => {
      if (thumb.src.includes('/a/')) return thumb.src = '/img/thumbnails/album.png'
      if (thumb.nextElementSibling.classList.contains('image')) return thumb.src = `/img/thumbnails/image.png`
      if (thumb.nextElementSibling.classList.contains('audio')) return thumb.src = `/img/thumbnails/audio.png`
      if (thumb.nextElementSibling.classList.contains('video')) return thumb.src = `/img/thumbnails/video.png`
    })
  })
})
