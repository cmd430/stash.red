const textFiles = document.querySelectorAll('.wrapper[data-type="text"]')
const escapeHtml = unsafe => {
  return unsafe
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll('\'', '&apos;')
}

for (const textFile of textFiles) {
  const text = textFile.querySelector('pre.text')

  fetch(text.textContent)
    .then(r => r.text())
    .then(content => {
      const contentSafe = escapeHtml(content)

      text.textContent = null
      text.insertAdjacentHTML('beforeend', `<span class="line">${contentSafe.split(/\n/).join('\n</span><span class="line">')}</span>`)
    })
    .catch(err => console.error(err))
}
