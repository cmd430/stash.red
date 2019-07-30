document.addEventListener('DOMContentLoaded', () => {
  for (let i = 0; i < 5; i++) {
    // Add 5 spacers to make the grid (its flex)
    // look nice on non full rows
    let spacer = document.createElement('div')
    spacer.classList.add('spacer')
    document.querySelector('#container').insertBefore(spacer, document.querySelector('.pagination'))
  }
})