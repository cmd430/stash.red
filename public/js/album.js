const albumDeleteButton = document.querySelector('a.album__delete')

albumDeleteButton?.addEventListener('click', async e => {
  const albumID = albumDeleteButton.dataset.id
  const albumUser = albumDeleteButton.dataset.username

  const deleteAlbum = await fetch(albumID, { method: 'DELETE' })
  const deleteAlbumStatus = deleteAlbum.status

  if (deleteAlbumStatus === 204) return location.assign(`/u/${albumUser}`)

  const deleteAlbumBody = await deleteAlbum.json()

  // TODO: show the error/info
  return console.error('something went wrong:', deleteAlbumBody)
})
