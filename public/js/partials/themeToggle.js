const themeToggles = Array.from(document.querySelectorAll('#themeToggle input'))
const pageRoot = document.querySelector('html')
const turnstile = document.querySelector('div.cf-turnstile')
const styles = []

function removeStyleFromSite (styleID) {
  if (!styles[styleID]) return

  document.body.removeChild(styles[styleID])
  delete styles[styleID]
}

function addStyleToSite (styleID, styleText) {
  if (styles[styleID]) removeStyleFromSite(styleID) //update style

  const style = document.createElement('style')

  style.textContent = styleText
  document.body.appendChild(style)
  styles[styleID] = style
}

function getStoredThemePref () {
  const validThemes = [
    'auto',
    'light',
    'dark'
  ]
  const storedTheme = localStorage.getItem('theme') ?? 'auto'

  return validThemes.includes(storedTheme) ? storedTheme : 'auto'
}

function setTheme (theme) {
  addStyleToSite('toggleTheme', `
    * {
      transition: 100ms linear !important;
    }
  `)

  if (theme === 'auto') {
    pageRoot.removeAttribute('data-theme')
  } else {
    pageRoot.setAttribute('data-theme', theme)
  }

  turnstile?.setAttribute('data-theme', theme)
  localStorage.setItem('theme', theme)

  setTimeout(() => removeStyleFromSite('toggleTheme'), 150)
}

const initalTheme = getStoredThemePref()

themeToggles.find(t => t.value === initalTheme).click()
setTheme(initalTheme)

for (const themeToggle of themeToggles) {
  themeToggle.addEventListener('click', e => {
    if (!themeToggle.checked) return
    setTheme(themeToggle.value)
  })
}
