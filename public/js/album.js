import { EventListener } from './utils/EventListner.js'

const albumContainer = document.querySelector('main > section')
const albumID = albumContainer.getAttribute('data-id')
const albumUser = albumContainer.getAttribute('data-username')
const albumTitle = albumContainer.getAttribute('data-title')
const albumEditButton = document.querySelector('a.album__edit')
const albumEditSaveButton = document.querySelector('a.album__save')
const albumEditCancelButton = document.querySelector('a.album__cancel')
const albumTitleInput = document.querySelector('header > h1.editable > input')

const albumItems = Array.from(albumContainer.querySelectorAll('span[data-order]'))
const modalContainer = document.querySelector('div#modals')

function checkForChanges () { // Called when we click 'Save'
  const changes = []

  // Get album title (input)
  let newTitle = albumTitleInput.value.trim()

  // client side sanitize (this is also validated on backend)
  if (newTitle.length === 0) newTitle = 'Untitled Album'
  if (newTitle !== albumTitle) changes.push({ title: newTitle })

  // Check if items are out of order (aka changed)
  if (albumItems.every((elm, index) => Number(elm.dataset.order) === index) === false) {
    // Sort into correct order and create edit payload
    // NOTE: Currently this sorts by `the data-order` attribute but i might have to change it to sort by the DOM order
    // depending on how i impliment the UI for order editing (manipulating DOM order might be easier because then we
    // dont have to worry about having multiple items with the same `data-order` value)
    const sortedAlbumItems = albumItems.sort((a, b) => a.dataset.order > b.dataset.order)
    const orderPayload = {}

    for (const albumItem of sortedAlbumItems) orderPayload[albumItem.dataset.id] = albumItem.dataset.order

    changes.push({ order: orderPayload })
  }

  return changes
}

function revertChanges (change) {
  if (change === undefined || change.title) albumTitleInput.value = albumTitle
  if (change === undefined || change.order) for (const [ index, albumItem ] of albumItems.entries()) albumItem.dataset.order = index
}

function toggleEditing (enable) {
  if (enable) {
    albumEditButton?.setAttribute('disabled', '')
    albumEditSaveButton?.removeAttribute('disabled')
    albumEditCancelButton?.removeAttribute('disabled')
    albumTitleInput?.classList.add('editing')
  } else {
    albumEditButton?.removeAttribute('disabled')
    albumEditSaveButton?.setAttribute('disabled', '')
    albumEditCancelButton?.setAttribute('disabled', '')
    albumTitleInput?.classList.remove('editing')
  }
}

async function saveEdits () {
  const changes = checkForChanges()

  if (changes.length === 0) return revertChanges()

  const successfulChanges = []

  for (const change of changes) {
    const eventListener = new EventListener({ once: true })

    if (change.title) {
      modalContainer.querySelector('#update_modal > p > span').innerHTML = `You are about to change this albums title from '<span>${albumTitle}</span>' to '<span>${change.title}</span>'`
      modalContainer.classList.add('update')
    }
    if (change.order) {
      modalContainer.querySelector('#update_modal > p > span').innerHTML = 'You are about to change the order of some items in this album'
      modalContainer.classList.add('update')
    }

    const changeType = Object.keys(change).pop()

    await new Promise(resolve => {
      eventListener.on('update', async () => {
        const editAlbum = await fetch(`/a/${albumID}`, {
          method: 'PATCH',
          headers:{
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            [changeType]: changeType === 'title' ? change[changeType] : JSON.stringify(change[changeType])
          })
        })

        if (editAlbum.status === 204) {
          successfulChanges.push(changeType)
          return resolve()
        }

        console.error('something went wrong editing the album', changeType)
        resolve()
      }, () => {
        revertChanges(change)
        resolve()
      })
    })
  }

  if (successfulChanges.length > 0) return location.reload()
}

albumEditButton?.addEventListener('click', () => {
  toggleEditing(true)
})
albumEditSaveButton?.addEventListener('click', () => {
  toggleEditing(false)
  saveEdits()
})
albumEditCancelButton?.addEventListener('click', () => {
  toggleEditing(false)
  revertChanges()
})

albumTitleInput?.addEventListener('keyup', e => {
  if (e.key === 'Escape') albumTitleInput.dispatchEvent(new Event('change'))
})
albumTitleInput?.addEventListener('change', albumTitleInput.blur)

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
