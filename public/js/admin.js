import { EventListener } from './utils/EventListner.js'
import prettyBytes from './vendor/pretty-bytes.js'

const modalContainer = document.querySelector('div#modals')
const totalSize = document.querySelector('.table > div > span.totalSize')
const uptime = document.querySelector('.table > div > span.uptime')
const restartButton = document.querySelector('button#restart')
const log = document.querySelector('#log > pre')
const selectLog = document.querySelector('select#selectLog')
const clearLogButton = document.querySelector('button#clearLog')

let logWS = null
let wsPing = null

function prettyTime (unformatted) {
  const hours = Math.floor(unformatted / (60 * 60)).toString()
  const minutes = Math.floor(unformatted % (60 * 60) / 60).toString()
  const seconds = Math.floor(unformatted % 60).toString()

  return `${hours.padStart('2', '0')}:${minutes.padStart('2', '0')}:${seconds.padStart('2', '0')}`
}

function viewLog (logType) {
  const wssURL = `${(location.href.endsWith('/') ? location.href : `${location.href}/`).replace('http', 'ws')}logs/${logType}`
  const ws = new WebSocket(wssURL)

  if (logWS !== null) logWS.close()

  ws.addEventListener('open', () => {
    clearLogButton.dispatchEvent(new Event('click'))
    wsPing = setInterval(() => ws.send(JSON.stringify({
      type: 'PING'
    })), 1000 * 30)
    log.insertAdjacentHTML('beforeend', '<span class="line">Connected to WebSocket\n</span>')
  })

  ws.addEventListener('message', ({ data }) => {
    const { type, message } = JSON.parse(data)
    const shouldScroll = (log.scrollTop + 60) >= (log.scrollHeight - log.clientHeight)

    if (type === 'PONG') return

    log.insertAdjacentHTML('beforeend', `<span class="line">${message}\n</span>`)

    while (log.childElementCount > 500) log.firstChild.remove()
    if (shouldScroll) log.scrollTop = log.scrollHeight
  })

  ws.addEventListener('close', () => {
    if (wsPing !== null) clearTimeout(wsPing)
    log.insertAdjacentHTML('beforeend', '<span class="line">Lost connection to WebSocket\n</span>')
  })

  ws.addEventListener('error', err => {
    log.insertAdjacentHTML('beforeend', `<span class="line">WebSocket Error: ${err.message}\n</span>`)
  })

  logWS = ws
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
clearLogButton.addEventListener('click', () => (log.textContent = null))
selectLog.addEventListener('change', () => viewLog(selectLog.value))

totalSize.textContent = prettyBytes(Number(totalSize.textContent), {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
})
uptime.textContent = prettyTime(Number(uptime.textContent))

viewLog(selectLog.value)
