import { EventListener } from './utils/EventListner.js'
import prettyBytes from './vendor/pretty-bytes.js'

const modalContainer = document.querySelector('div#modals')
const totalSize = document.querySelector('#table > div > span.totalSize')
const uptime = document.querySelector('#table > div > span.uptime')
const restartButton = document.querySelector('button#restart')
const log = document.querySelector('pre#log')

function prettyTime (unformatted) {
  const hours = Math.floor(unformatted / (60 * 60)).toString()
  const minutes = Math.floor(unformatted % (60 * 60) / 60).toString()
  const seconds = Math.floor(unformatted % 60).toString()

  return `${hours.padStart('2', '0')}:${minutes.padStart('2', '0')}:${seconds.padStart('2', '0')}`
}

function viewLog (logType) {
  const wssURL = `${(location.href.endsWith('/') ? location.href : `${location.href}/`).replace('http', 'ws')}logs/${logType}`
  const ws = new WebSocket(wssURL)

  ws.addEventListener('message', ({ data }) => {
    const { type, message } = JSON.parse(data)

    if (type === 'message') {
      log.append(`${message}\n`)
      log.scrollTop = log.scrollHeight
    }
  })
}

restartButton.addEventListener('click', async () => {
  const eventListener = new EventListener({ once: true })

  modalContainer.classList.add('restart')

  eventListener.on('restart', async () => {
    await fetch('/admin/restart', {
      method: 'POST'
    })

    restartButton.setAttribute('disabled', 'true')
    setTimeout(() => location.reload(), 5000)
  })
})

totalSize.textContent = prettyBytes(Number(totalSize.textContent), {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
})
uptime.textContent = prettyTime(Number(uptime.textContent))

viewLog('combined')
