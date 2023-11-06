const fileDeleteButtons = document.querySelectorAll('a.action__delete')

for (const fileDeleteButton of fileDeleteButtons) fileDeleteButton.addEventListener('click', async () => {
  const fileContaimer = fileDeleteButton.parentElement.parentElement
  const fileID = fileContaimer.getAttribute('data-id')
  const fileUser = fileContaimer.getAttribute('data-username')
  const deleteFile = await fetch(`/f/${fileID}`, { method: 'DELETE' })
  const deleteFileStatus = deleteFile.status

  if (deleteFileStatus !== 204) return console.error('something went wrong deleting the album')
  if (location.pathname.startsWith('/a/') && document.querySelectorAll('span.wrapper').length > 1) return location.reload()

  return location.assign(`/u/${fileUser}/`)
})

