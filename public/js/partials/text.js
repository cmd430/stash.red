const textFiles = document.querySelectorAll('.wrapper[data-type="text"]')

for (const textFile of textFiles) {
  const text = textFile.querySelector('pre.text')

  fetch(text.textContent)
    .then(r => r.text())
    .then(content => {
      text.textContent = null
      text.insertAdjacentHTML('beforeend', `<span class="line">${content.split(/\n/).join('\n</span><span class="line">')}</span>`)
    })
    .catch(err => console.error(err))
}
