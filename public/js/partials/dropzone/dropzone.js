import { setProgress, setProgressText, setProgressError, prepareProgress } from './progress.js'

// Dropzone
const dropzone = document.querySelector('#dropzone')
const dropzoneLabel = dropzone.querySelector('#label')
const fileInput = dropzone.querySelector('input[type="file"]')
// Home page buttons
const buttons = document.querySelector('#buttons')
const settingsButton = buttons?.querySelector('#settingsBtn')
// Home page settings container
const settings = document.querySelector('#settings')
// Home page upload settings
const settingTimeToLive = settings?.querySelector('#timeToLive')
const settingIsPrivate = settings?.querySelector('#isPrivate')
const settingDontFormAlbum = settings?.querySelector('#dontFormAlbum')
// Home page after upload settings
const settingCopyLinkToClipboard = settings?.querySelector('#copyLinkToClipboard')
const settingCopyDirectFileLinks = settings?.querySelector('#copyDirectFileLinks')

async function uploadComplete (response) {
  const { status } = response

  if (status === 200 || status === 201) { // Success
    if (!settingCopyLinkToClipboard) return location.assign(response.path)

    try {
      if (settingCopyDirectFileLinks && response.direct) {
        await navigator.clipboard.writeText(`${origin}${response.direct}`)
      } else {
        await navigator.clipboard.writeText(`${origin}${response.path}`)
      }
    } finally {
      location.assign(response.path)
    }
  } else { // Error
    setProgressError(response)
  }
}

async function uploadFiles (files) {
  const formData = new FormData()

  prepareProgress(() => {
    fileInput.disabled = true
    dropzoneLabel.classList.add('hidden')

    if (!buttons) return

    buttons.classList.add('invisible')
    setTimeout(() => buttons.classList.add('hidden'), 200)

    if (settingsButton.classList.contains('active')) settingsButton.click()
    settingsButton.classList.add('hidden')
  })

  if (typeof files === 'string') {
    if (files.startsWith('http')) {
      // URL
      // TODO: allow sending the server a URL and then the server will attempt to fetch the resource
    } else {
      // Text Upload
      files = new File([ files ], 'clipboard.txt', {
        type: 'text/plain'
      })
    }
  }

  if (settings) {
    // Feilds
    formData.append('timeToLive', settingTimeToLive.value ?? 0)
    formData.append('isPrivate', Number(settingIsPrivate.checked) ?? Number(false))
    formData.append('dontFormAlbum', Number(settingDontFormAlbum.checked) ?? Number(false))
  }

  // Files
  for (const file of Array.from([ ...(files[Symbol.iterator] ? files : [ files ]) ])) formData.append('files[]', file)

  setProgressText('Uploading: 0%')

  return new Promise((resolve, reject) => {
    if (files.length === 0) return reject(new Error('File upload failed'))

    const xhr = new XMLHttpRequest()

    xhr.upload.addEventListener('progress', setProgress)
    xhr.addEventListener('load', () => resolve(JSON.parse(xhr.responseText)))
    xhr.addEventListener('error', () => reject(new Error('File upload failed')))
    xhr.addEventListener('abort', () => reject(new Error('File upload aborted')))
    xhr.open('POST', '/upload', true)
    xhr.send(formData)
  })
    .then(uploadComplete)
    .catch(setProgressError)
}

document.addEventListener('dragover', e => e.preventDefault())
document.addEventListener('dragenter', e => e.preventDefault())
document.addEventListener('dragleave', e => e.preventDefault())
document.addEventListener('drop', e => e.preventDefault())

window.addEventListener('paste', async e => {
  if (fileInput.disabled) return

  for (const clipboardItem of e.clipboardData.items) {
    if (clipboardItem.kind === 'file') {
      if (!clipboardItem.type.includes('image') && !clipboardItem.type.includes('video') && !clipboardItem.type.includes('audio')) continue

      uploadFiles(clipboardItem.getAsFile())
    } else if (clipboardItem.kind === 'string' && clipboardItem.type === 'text/plain') {
      clipboardItem.getAsString(text => uploadFiles(text))
    }
  }
})

dropzone.addEventListener('click', e => (fileInput.files.length === 0 ? fileInput.click() : undefined))
dropzone.addEventListener('dragover', e => e.preventDefault())
dropzone.addEventListener('dragenter', e => e.preventDefault())
dropzone.addEventListener('drop', e => {
  e.preventDefault()
  uploadFiles(e.dataTransfer.files)
})

fileInput.addEventListener('change', e => uploadFiles(fileInput.files))

// Clear files on page load
if (fileInput.files.length > 0) fileInput.value = ''

// Prevent issues with persisted page
window.addEventListener('pageshow', e => {
  if (e.persisted) location.reload()
})
