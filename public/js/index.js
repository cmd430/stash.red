document.addEventListener('DOMContentLoaded', () => {
  let button__settings = document.querySelector('#settingsBtn')
  let panel__settings = document.querySelector('#settings')

  let setting__copylink = document.querySelector('#cltcb')
  let setting__directlink = document.querySelector('#dlfi')

  if (button__settings) {
    button__settings.addEventListener('click', e => {
      if (button__settings.classList.contains('active')) {
        button__settings.classList.remove('active')
        panel__settings.classList.add('invisible')
        setTimeout(() => {
          panel__settings.classList.add('hidden')
        }, 200)
      } else {
        button__settings.classList.add('active')
        panel__settings.classList.remove('hidden')
        setTimeout(() => {
          // Hack to make shit work
          panel__settings.classList.remove('invisible')
        }, 0)
      }
    })
  }

  setting__copylink.checked = JSON.parse(localStorage.getItem('AutoCopyLink')) || false
  setting__directlink.checked = JSON.parse(localStorage.getItem('CopyDirectLink')) || false

  setting__copylink.addEventListener('change', e => {
    localStorage.setItem('AutoCopyLink', setting__copylink.checked)
  })
  setting__directlink.addEventListener('change', e => {
    localStorage.setItem('CopyDirectLink', setting__directlink.checked)
  })

})
