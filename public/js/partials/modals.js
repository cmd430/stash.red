const modalContainer = document.querySelector('div#modals')
const modalButtons = modalContainer.querySelectorAll('.modal div button')

for (const modalButton of modalButtons) modalButton.addEventListener('click', () => {
  modalContainer.setAttribute('class', 'blackout')
  dispatchEvent(new CustomEvent(modalButton.classList.item(0)))
})
