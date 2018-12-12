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
    if (preview.getAttribute('style') === 'background: url(\'\') center center / contain no-repeat') {
      preview.setAttribute('style', `background: url('${preview.dataset.fallback}') center center / contain no-repeat`)
    }
    // Add transperancy background
    preview.setAttribute('style', `${preview.getAttribute('style')}, linear-gradient(45deg, rgb(221, 221, 221) 25%, rgba(0, 0, 0, 0) 25%) 0 0/20px 20px, linear-gradient(-45deg, rgb(221, 221, 221) 25%, rgba(0, 0, 0, 0) 25%) 0 10px/20px 20px, linear-gradient(45deg, rgba(0, 0, 0, 0) 75%, rgb(221, 221, 221) 75%) 10px -10px/20px 20px, linear-gradient(-45deg, rgba(0, 0, 0, 0) 75%, rgb(221, 221, 221) 75%) -10px 0px/20px 20px, rgb(255, 255, 255)`)
  })
})