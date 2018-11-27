document.addEventListener('DOMContentLoaded', () => {

  let settingsButton = document.querySelector('#settingsBtn')
  let settingsPanel = document.querySelector('#settings')
  let setting__copylink = document.querySelector('#cltcb')
  let setting__directlink = document.querySelector('#cltcb')

  settingsButton.addEventListener('click', e => {
    if (settingsButton.classList.contains('active')) {
      settingsButton.classList.remove('active')
      settingsPanel.classList.add('invisible')
      setTimeout(() => {
        settingsPanel.classList.add('hidden')
      }, 200)
    } else {
      settingsButton.classList.add('active')
      settingsPanel.classList.remove('hidden')
      setTimeout(() => {
        // Hack to make shit work
        settingsPanel.classList.remove('invisible')
      }, 0)
    }
  })

  setting__copylink.addEventListener('click', e => {

  })
  setting__directlink.addEventListener('click', e => {

  })

})