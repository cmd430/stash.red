const albumContainer = document.querySelector('main > section')
const albumID = albumContainer.getAttribute('data-id')
const albumUser = albumContainer.getAttribute('data-username')
const albumTitle = albumContainer.getAttribute('data-title')
const albumTitleInput = document.querySelector('header > h1.editable > input')

document.querySelector('a.album__edit')?.addEventListener('click', () => {
  albumTitleInput?.classList.add('editing')
  albumTitleInput?.setSelectionRange(albumTitleInput.value.length, albumTitleInput.value.length)
  albumTitleInput?.focus()
})

albumTitleInput?.addEventListener('change', async () => {
  // TODO: show popup modal to confirm/cancel the title change

  albumTitleInput?.classList.remove('editing')

  const newTitle = albumTitleInput.value.trim()

  if (newTitle === '' || newTitle === albumTitle) return (albumTitleInput.value = albumTitle)

  const editAlbumTitle = await fetch(`/a/${albumID}`, {
    method: 'PATCH',
    headers:{
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      'title': newTitle
    })
  })
  const editAlbumTitleStatus = editAlbumTitle.status

  if (editAlbumTitleStatus === 204) return location.reload()

  return console.error('something went wrong editing the album title')
})

document.querySelector('a.album__delete')?.addEventListener('click', async () => {
  // TODO: show popup modal to confirm/cancel the delete

  const deleteAlbum = await fetch(`/a/${albumID}`, { method: 'DELETE' })
  const deleteAlbumStatus = deleteAlbum.status

  if (deleteAlbumStatus === 204) return location.assign(`/u/${albumUser}/albums/`)
  if (deleteAlbumStatus === 200) return location.reload()

  return console.error('something went wrong deleting the album')
})


