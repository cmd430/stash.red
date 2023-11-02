const textFiles = document.querySelectorAll('.wrapper[data-text-id]')

for (const textFile of textFiles) {
  const path = textFile.getAttribute('data-text-path')
  const code = textFile.querySelector('pre.text > code')

  fetch(path)
    .then(r => r.text())
    .then(text => (code.textContent = text))
    .catch(err => console.error(err))
}
