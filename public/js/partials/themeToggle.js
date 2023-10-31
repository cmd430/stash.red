function getStoredThemePref () {
  const validThemes = [
    'auto',
    'light',
    'dark'
  ]
  const storedTheme = localStorage.getItem('theme') ?? 'auto'

  return validThemes.includes(storedTheme) ? storedTheme : 'auto'
}

function setTheme (root, theme) {
  if (theme === 'auto') {
    root.removeAttribute('data-theme')
  } else {
    root.setAttribute('data-theme', theme)
  }
  localStorage.setItem('theme', theme)
}

const initalTheme = getStoredThemePref()
const themeToggles = Array.from(document.querySelectorAll('#themeToggle input'))
const pageRoot = document.querySelector('html')

themeToggles.find(t => t.value === initalTheme).click()
setTheme(pageRoot, initalTheme)

for (const themeToggle of themeToggles) {
  themeToggle.addEventListener('click', e => {
    if (!themeToggle.checked) return
    setTheme(pageRoot, themeToggle.value)
  })
}
