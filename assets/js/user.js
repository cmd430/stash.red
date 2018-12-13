document.addEventListener('DOMContentLoaded', () => {
  for (let i = 1; i < 5; i++) {
    // Add 4 spacers to make the grid (its flex)
    // look nice on non full rows
    let spacer = document.createElement('div')
    spacer.classList.add('spacer')
    document.querySelector('#container').appendChild(spacer)
  }
  document.querySelectorAll('.preview').forEach(preview => {
    // any missing thumbnails will be
    // changed to the generic icon
    let image = preview.querySelector('.image')
    if (image.getAttribute('style') === 'background-image: url(\'\')') {
      image.setAttribute('style', `background-image: url('${image.dataset.fallback}')`)
    }
  })
})