import { EventListener } from './utils/EventListner.js'

const filterButton = document.querySelector('a.user__filter')
const modalContainer = document.querySelector('div#modals')
const filterSelect = modalContainer.querySelector('select#filter')
const sortSelect = modalContainer.querySelector('select#sort')

filterButton.addEventListener('click', async () => {
  const eventListener = new EventListener({ once: true })

  modalContainer.classList.add('filter')
  eventListener.on('filter', async () => {
    const filter = filterSelect.value
    const sort = sortSelect.value
    const url = new URL(location.href)

    url.searchParams.set('filter', filterSelect.value)
    url.searchParams.set('sort', sortSelect.value)

    if (filter === '') url.searchParams.delete('filter')
    if (sort === '' || sort === 'DESC') url.searchParams.delete('sort')

    return location.assign(url)
  })
})

