const textFiles = document.querySelectorAll('.wrapper[data-type="text"]')

for (const textFile of textFiles) {
  const code = textFile.querySelector('pre.text > code')

  fetch(code.textContent)
    .then(r => r.text())
    .then(text => (code.textContent = text))
    .catch(err => console.error(err))
}
