const previews = document.querySelectorAll('.preview a')

for (const preview of previews) {
  const type = Array.from(preview.querySelector('img + span.icon').classList).pop()
  const img = preview.querySelector('img')

  img.addEventListener('error', () => (img.src = `/img/thumbnails/${type}.webp`), {
    once: true
  })
}
