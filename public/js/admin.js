function webLog (message = []) {
  let logContainer = document.querySelector('.log_container')
  let autoScroll = false
  if (logContainer.scrollHeight - logContainer.scrollTop === logContainer.clientHeight) {
    autoScroll = true
  }
  let log = document.querySelector('.log')
  let logLine = document.createElement('span')
  message.forEach((segment, index) => {
    let logSegment = document.createElement('font')
    logSegment.setAttribute('style', `color: ${segment.color}`)
    logSegment.textContent = `${index === 0 ? ' ' : ''}${segment.text}${index = message.length ? '' : ' '}`
    logLine.appendChild(logSegment)
  })
  log.appendChild(logLine)
  if (autoScroll) {
    logContainer.scrollTop = logContainer.scrollHeight
  }
}

document.addEventListener('DOMContentLoaded', () => {
  let es = null
  function initES() {
    if (es == null || es.readyState == 2) {
      es = new EventSource('/events', {
        withCredentials: true
      })
      es.onerror = e => {
        if (es.readyState == 2) {
          setTimeout(initES, 5000)
        }
      }
      es.onmessage = event => {
        webLog(JSON.parse(event.data).message)
      }
    }
  }
  initES()
})
