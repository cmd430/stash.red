
// Home page buttons
const buttons = document.querySelector('#buttons')
const settingsButton = buttons?.querySelector('#settingsBtn')
// Home page settings container
const settings = document.querySelector('#settings')
// Home page after upload settings
const settingCopyLinkToClipboard = settings?.querySelector('#copyLinkToClipboard')
const settingCopyDirectFileLinks = settings?.querySelector('#copyDirectFileLinks')

if (settingsButton) {
  settingsButton.addEventListener('click', e => {
    if (settingsButton.classList.contains('active')) {
      settingsButton.classList.remove('active')
      settings.classList.add('invisible')
      setTimeout(() => settings.classList.add('hidden'), 200)
    } else {
      settingsButton.classList.add('active')
      settings.classList.remove('hidden')
      setTimeout(() => settings.classList.remove('invisible'), 0)
    }
  })

  settingCopyLinkToClipboard.checked = JSON.parse(localStorage.getItem('AutoCopyLink')) || false
  settingCopyDirectFileLinks.checked = JSON.parse(localStorage.getItem('CopyDirectLink')) || false

  settingCopyLinkToClipboard.addEventListener('change', () => localStorage.setItem('AutoCopyLink', settingCopyLinkToClipboard.checked))
  settingCopyDirectFileLinks.addEventListener('change', () => localStorage.setItem('CopyDirectLink', settingCopyDirectFileLinks.checked))
}

// TEMP
window.toggleTheme = function toggleTheme () {
  const preferredScheme = window.matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light'
  const page = document.querySelector('html')
  const current = page.getAttribute('data-theme')

  page.setAttribute('data-theme', (current ?? preferredScheme) === 'light' ? 'dark' : 'light')
}
