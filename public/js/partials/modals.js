const modalContainer = document.querySelector('div#modals')
const modalButtons = modalContainer.querySelectorAll('.modal div button')

for (const modalButton of modalButtons) modalButton.addEventListener('click', () => {
  modalContainer.classList.remove('delete', 'update', 'dropzone')
  dispatchEvent(new CustomEvent(modalButton.classList.item(0)))
})

