const themeToggles = Array.from(document.querySelectorAll('#themeToggle input'))
const pageRoot = document.querySelector('html')
const turnstile = document.querySelector('div.cf-turnstile')

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
  if (theme === 'auto') {
    pageRoot.removeAttribute('data-theme')
  } else {
    pageRoot.setAttribute('data-theme', theme)
  }

  turnstile?.setAttribute('data-theme', theme)
  localStorage.setItem('theme', theme)
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
