const progress = document.querySelector('#progress')
const progressFill = progress.querySelector('#fill')
const progressText = progress.querySelector('#text')

function clearClasses () {
  progress.classList.remove('hidden', 'invisible', 'processing', 'warning', 'error')
}

function setClass (c) {
  clearClasses()

  if (c) progress.classList.add(c)
}

function setProgressFill (percentage) {
  progressFill.setAttribute('style', `width: ${percentage}%;`)
}

export function setProgressText (text) {
  progressText.textContent = text
}

export function setProgressWarning (msg) {
  setProgressText(msg ?? 'Unknown Warning')
  setProgressFill(100)
  setClass('warning')
}

export function setProgressError (error = {}) {
  const errors = {
    413: 'Request payload too large'
  }
  const errorMessage = error.message ?? errors[error.status] ?? 'Unknown Error'

  console.debug(error.status ? `${error.status}: ${errorMessage}` : errorMessage)

  setProgressText(errorMessage)
  setProgressFill(100)
  setClass('error')
}

export function setProgress (e) {
  if (!e.lengthComputable) return setProgressWarning('Uploading: Progress Unavailable')

  const percentage = (e.loaded / e.total) * 100

  setProgressText(`Uploading: ${Math.round(percentage)}%`)
  setProgressFill(percentage)

  if (percentage === 100) {
    setProgressText('Processing')
    setClass('processing')
  }
}

export function prepareProgress (cb) {
  setProgressText('Preparing Uploads')
  setProgressFill(0)
  clearClasses()
  cb()
}
