document.querySelector('a.album__delete')?.addEventListener('click', async () => {
  const albumContainer = document.querySelector('main > section')
  const albumID = albumContainer.getAttribute('data-id')
  const albumUser = albumContainer.getAttribute('data-username')
  const deleteAlbum = await fetch(`/a/${albumID}`, { method: 'DELETE' })
  const deleteAlbumStatus = deleteAlbum.status

  if (deleteAlbumStatus === 204) return location.assign(`/u/${albumUser}/albums/`)
  if (deleteAlbumStatus === 200) return location.reload()

  return console.error('something went wrong deleting the album')
})
