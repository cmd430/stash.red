import { EventListener } from './utils/EventListner.js'

const filterButton = document.querySelector('a.user__filter')
const modalContainer = document.querySelector('div#modals')

filterButton.addEventListener('click', async () => {
  const eventListener = new EventListener({ once: true })

  modalContainer.classList.add('filter')

  eventListener.on('filter', async () => {
    alert('filter')
  })
})

