import { EventListener } from './utils/EventListner.js'

const albumContainer = document.querySelector('main > section')
const albumID = albumContainer.getAttribute('data-id')
const albumUser = albumContainer.getAttribute('data-username')
const albumTitle = albumContainer.getAttribute('data-title')
const albumTitleInput = document.querySelector('header > h1.editable > input')
const modalContainer = document.querySelector('div#modals')

document.querySelector('a.album__edit')?.addEventListener('click', () => {
  albumTitleInput?.classList.add('editing')
  albumTitleInput?.setSelectionRange(albumTitleInput.value.length, albumTitleInput.value.length)
  albumTitleInput?.focus()
})

albumTitleInput?.addEventListener('keyup', e => {
  if (e.key === 'Escape') albumTitleInput.dispatchEvent(new Event('change'))
})
albumTitleInput?.addEventListener('change', albumTitleInput.blur)
albumTitleInput?.addEventListener('blur', async () => {
  albumTitleInput?.classList.remove('editing')

  let newTitle = albumTitleInput.value.trim()

  if (newTitle.length === 0) newTitle = 'Untitled Album'
  if (newTitle === albumTitle) return (albumTitleInput.value = albumTitle)

  const eventListener = new EventListener({ once: true })

  modalContainer.querySelector('#update_modal > p > span').innerHTML = `You are about to change this albums title from '<span>${albumTitle}</span>' to '<span>${newTitle}</span>'`
  modalContainer.classList.add('update')

  eventListener.on('update', async () => {
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
  }, () => {
    albumTitleInput.value = albumTitle
  })
})

document.querySelector('a.album__delete')?.addEventListener('click', () => {
  const eventListener = new EventListener({ once: true })

  modalContainer.classList.add('delete')

  eventListener.on('delete', async () => {
    const deleteAlbum = await fetch(`/a/${albumID}`, { method: 'DELETE' })
    const deleteAlbumStatus = deleteAlbum.status

    if (deleteAlbumStatus === 204) return location.assign(`/u/${albumUser}/albums/`)
    if (deleteAlbumStatus === 200) return location.reload()

    return console.error('something went wrong deleting the album')
  })
})


