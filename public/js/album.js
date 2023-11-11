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
const actionButtonContainers = albumContainer?.querySelectorAll('div.actions')
const orderButtonContainers = albumContainer?.querySelectorAll('div.orders')
const modalContainer = document.querySelector('div#modals')
const dropzone = modalContainer.querySelector('#dropzone')

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
    const sortedAlbumItems = albumItems.sort((a, b) => a.dataset.order > b.dataset.order)
    const orderPayload = {}

    for (const albumItem of sortedAlbumItems) orderPayload[albumItem.dataset.id] = albumItem.dataset.order

    changes.push({ order: orderPayload })
  }

  return changes
}

function revertChanges (change) {
  if (change === undefined || change.title) albumTitleInput.value = albumTitle
  if (change === undefined || change.order) {
    const sortedAlbumItems = albumItems.sort((a, b) => (a.dataset.originalOrder ?? a.dataset.order) > (b.dataset.originalOrder ?? b.dataset.order))

    for (const [ index, albumItem ] of sortedAlbumItems.entries()) {
      albumItem.dataset.order = index
      albumContainer.append(albumItem)
      albumItem.removeAttribute('data-original-order')
    }
  }
}

function toggleEditing (enable) {
  if (enable) {
    albumEditButton?.setAttribute('disabled', '')
    albumEditSaveButton?.removeAttribute('disabled')
    albumEditCancelButton?.removeAttribute('disabled')
    albumTitleInput?.classList.add('editing')

    for (const actionButtonContainer of actionButtonContainers) {
      actionButtonContainer.setAttribute('disabled', '')
    }
    for (const orderButtonContainer of orderButtonContainers) {
      orderButtonContainer.removeAttribute('disabled')
    }
  } else {
    albumEditButton?.removeAttribute('disabled')
    albumEditSaveButton?.setAttribute('disabled', '')
    albumEditCancelButton?.setAttribute('disabled', '')
    albumTitleInput?.classList.remove('editing')

    for (const actionButtonContainer of actionButtonContainers) {
      actionButtonContainer.removeAttribute('disabled')
    }
    for (const orderButtonContainer of orderButtonContainers) {
      orderButtonContainer.setAttribute('disabled', '')
    }
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
        revertChanges(change)
        resolve()
      }, () => {
        revertChanges(change)
        resolve()
      })
    })
  }

  if (successfulChanges.length > 0) return location.reload()
}

function getFile (e) {
  return e.currentTarget.parentElement.parentElement
}
function getSiblingFiles () {
  return Array.from(albumContainer.querySelectorAll('span.wrapper'))
}
function swapElements (elm1, elm2) {
  const temp = document.createElement('div')

  elm1.parentNode.insertBefore(temp, elm1)
  elm2.parentNode.insertBefore(elm1, elm2)
  temp.parentNode.insertBefore(elm2, temp)
  temp.parentNode.removeChild(temp)
}

for (const orderButtonContainer of orderButtonContainers) {
  orderButtonContainer.querySelector('a.order__up').addEventListener('click', e => {
    const file = getFile(e)
    const siblings = getSiblingFiles()
    const order = siblings.indexOf(file) - 1
    const prevFile = siblings[order]

    prevFile.dataset.order = order + 1
    prevFile.dataset.originalOrder ??= order
    file.dataset.order = order
    file.dataset.originalOrder ??= order + 1

    swapElements(prevFile, file)
  })
  orderButtonContainer.querySelector('a.order__down').addEventListener('click', e => {
    const file = getFile(e)
    const siblings = getSiblingFiles()
    const order = siblings.indexOf(file) + 1
    const nextFile = siblings[order]

    file.dataset.order = order
    file.dataset.originalOrder ??= order - 1
    nextFile.dataset.order = order - 1
    nextFile.dataset.originalOrder ??= order

    swapElements(file, nextFile)
  })
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

document.addEventListener('dragover', e => {
  e.preventDefault()
  if (!modalContainer.classList.contains('dropzone')) modalContainer.classList.add('dropzone')
})

document.addEventListener('dragenter', e => {
  e.preventDefault()
  if (!modalContainer.classList.contains('dropzone')) modalContainer.classList.add('dropzone')
})

document.addEventListener('dragleave', e => {
  e.preventDefault()
  if ((/Chrome/).test(navigator.userAgent) && !e.clientX && !e.clientY) {
    if (modalContainer.classList.contains('dropzone')) modalContainer.classList.remove('dropzone')
  } else if (!(/Chrome/).test(navigator.userAgent)) {
    if (modalContainer.classList.contains('dropzone')) modalContainer.classList.remove('dropzone')
  }
}, false)

document.addEventListener('drop', e => {
  e.preventDefault()

  if (modalContainer.classList.contains('dropzone') && e.currentTarget !== dropzone) modalContainer.classList.remove('dropzone')
})

window.addEventListener('paste', async e => {
  e.preventDefault()
  if (!modalContainer.classList.contains('dropzone')) modalContainer.classList.add('dropzone')
})
