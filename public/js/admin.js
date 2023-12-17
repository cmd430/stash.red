import { EventListener } from './utils/EventListner.js'
import prettyBytes from './vendor/pretty-bytes.js'

const modalContainer = document.querySelector('div#modals')
const totalSize = document.querySelector('.table > div > span.totalSize')
const uptime = document.querySelector('.table > div > span.uptime')
const restartButton = document.querySelector('button#restart')
const log = document.querySelector('#log > pre')
const selectLog = document.querySelector('select#selectLog')
const clearLogButton = document.querySelector('button#clearLog')

const MAX_LOG_LINES = 1000

let logWS = null
let wsPing = null

function prettyTime (unformatted, opts) {
  // format tokens
  /*
    type
      $ = dont include 0 values
      % = include 0 values

    token
      D  = non padded days
      DD = lead 0 padded days
      H  = non padded hours
      HH = lead 0 padded hours
      M  = non padded minutes
      MM = lead 0 padded minutes
      S  = non padded seconds
      SS = lead 0 padded seconds

    seperator
      can basically be anything
  */
  const { format = '$DD:%HH:%MM:%SS' } = opts ?? {}
  const days = Math.floor(unformatted / ((60 * 60) * 24)).toString()
  const hours = Math.floor(unformatted % ((60 * 60) * 24) / (60 * 60)).toString()
  const minutes = Math.floor(unformatted % (60 * 60) / 60).toString()
  const seconds = Math.floor(unformatted % 60).toString()

  let output = format

  const formatParts = format.matchAll(/(?<fullGroup>(?<fullTtoken>(?<tokenType>[$%]{1})(?<token>[A-Z])\4{0,1})(?<seperator>.+?(?=[$%]{1}|$))?)/g)
  for (const { groups: { fullGroup, fullTtoken, tokenType, token } } of formatParts) {
    let segment

    switch (token) {
      case 'D': {
        segment = days
        break
      } case 'H': {
        segment = hours
        break
      } case 'M': {
        segment = minutes
        break
      } case 'S': {
        segment = seconds
        break
      } default: {
        segment = fullTtoken
      }
    }

    if (fullTtoken.length === 3) segment = segment.padStart('2', '0')
    if (tokenType === '$' && Number(segment) === 0) {
      output = output.replace(fullGroup, '')
      continue
    }

    output = output.replace(fullTtoken, segment)
  }

  return output
}

function adminLog (message) {
  const shouldScroll = (log.scrollTop + 60) >= (log.scrollHeight - log.clientHeight)

  log.insertAdjacentHTML('beforeend', `<span class="line">${message}\n</span>`)

  while (log.childElementCount > MAX_LOG_LINES) log.firstChild.remove()

  if (shouldScroll) log.scrollTop = log.scrollHeight
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
    adminLog('Connected to WebSocket')
  })

  ws.addEventListener('message', ({ data }) => {
    const { type, message } = JSON.parse(data)

    if (type === 'PONG') return

    adminLog(message)
  })

  ws.addEventListener('close', () => {
    if (wsPing !== null) clearTimeout(wsPing)

    adminLog('Lost connection to WebSocket')
  })

  ws.addEventListener('error', () => adminLog('WebSocket Error'))

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
uptime.textContent = prettyTime(Number(uptime.textContent), {
  format: '$Dd %HHh %MMm %SSs'
})

viewLog(selectLog.value)
