import { EventListener } from './utils/EventListner.js'

const fileContainer = document.querySelector('main > section')
const fileUser = fileContainer.getAttribute('data-username')
const fileDeleteButtons = document.querySelectorAll('a.action__delete')
const modalContainer = document.querySelector('div#modals')

for (const fileDeleteButton of fileDeleteButtons) fileDeleteButton.addEventListener('click', async () => {
  const eventListener = new EventListener({ once: true })

  modalContainer.classList.add('delete')

  eventListener.on('delete', async () => {
    const fileContaimer = fileDeleteButton.parentElement.parentElement
    const fileID = fileContaimer.getAttribute('data-id')
    const deleteFile = await fetch(`/f/${fileID}`, { method: 'DELETE' })
    const deleteFileStatus = deleteFile.status

    if (deleteFileStatus !== 204) return console.error('something went wrong deleting the album')
    if (location.pathname.startsWith('/a/') && document.querySelectorAll('span.wrapper').length > 1) return location.reload()

    return location.pathname.startsWith('/a/') ? location.assign(`/u/${fileUser}/albums`) : location.assign(`/u/${fileUser}`)
  })
})

