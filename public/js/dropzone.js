const filePicker = document.querySelector('#files')
const fileDropzone = document.querySelector('#dropzone')

const uploadFiles = async files => {
  if (typeof files === 'string') {
    files = [
      new File([ files ], 'clipboard.txt', {
        type: 'text/plain'
      })
    ]
  }

  console.debug(files)

  if (files.length === 0) return reject(new Error('File upload failed'))

  const formData = new FormData()
  const filesArray = Array.from(files)

  for (const file of filesArray) formData.append('files[]', file)

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    xhr.upload.addEventListener('progress', e => console.debug('Progress', (e.loaded / e.total) * 100, '%'))
    xhr.addEventListener('load', () => resolve({ status: xhr.status, body: xhr.responseText }))
    xhr.addEventListener('error', () => reject(new Error('File upload failed')))
    xhr.addEventListener('abort', () => reject(new Error('File upload aborted')))
    xhr.open('POST', '/upload', true)
    xhr.send(formData)
  })
}


if (filePicker.files.length > 0) filePicker.value = ''

fileDropzone.addEventListener('click', e => (filePicker.files.length === 0 ? filePicker.click() : undefined))
fileDropzone.addEventListener('dragover', e => e.preventDefault())
fileDropzone.addEventListener('dragenter', e => e.preventDefault())
fileDropzone.addEventListener('drop', e => {
  e.preventDefault()
  uploadFiles(e.dataTransfer.files)
    .then(response => console.debug(response))
    .catch(error => console.error(error))
})
filePicker.addEventListener('change', e => uploadFiles(filePicker.files)
  .then(response => console.debug(response))
  .catch(error => console.error(error)))

document.addEventListener('dragover', e => e.preventDefault())
document.addEventListener('dragenter', e => e.preventDefault())
document.addEventListener('dragleave', e => e.preventDefault())
document.addEventListener('drop', e => e.preventDefault())


/* FOR ALBUM PAGE
document.addEventListener('dragover', e => {
  if (!isHome && !blackout.classList.contains('dropzone')) blackout.classList.add('dropzone')
})
document.addEventListener('dragenter', e => {
  if (!isHome && !blackout.classList.contains('dropzone')) blackout.classList.add('dropzone')
})
document.addEventListener('dragleave', e => {
  if (/Chrome/.test(navigator.userAgent) && !e.clientX && !e.clientY) {
    if (!isHome && blackout.classList.contains('dropzone')) blackout.classList.remove('dropzone')
  } else if (!/Chrome/.test(navigator.userAgent)) {
    if (!isHome && blackout.classList.contains('dropzone')) blackout.classList.remove('dropzone')
  }
}, false)
document.addEventListener('drop', e => {
  if (!isHome && blackout.classList.contains('dropzone') && e.target !== fileDropzone) blackout.classList.remove('dropzone')
})

*/

window.addEventListener('paste', async e => {
  //if (progress__bar.classList.contains('hidden')) {
  const uploadPromise = data => uploadFiles(data)
    .then(response => console.debug(response))
    .catch(error => console.error(error))

  for (const clipboardItem of e.clipboardData.items) {
    if (clipboardItem.kind === 'file') {
      if (!clipboardItem.type.includes('image') && !clipboardItem.type.includes('video') && !clipboardItem.type.includes('audio')) continue

      uploadPromise(clipboardItem.getAsFile())
    } else if (clipboardItem.kind === 'string' && clipboardItem.type === 'text/plain') {
      clipboardItem.getAsString(text => uploadPromise(text))
    }
  }
  //}
})


/*
document.getElementById('fileUpload').addEventListener('change', async e => {
const onProgress = progress => console.log('Progress:', `${Math.round(progress * 100)}%`);
const response = await uploadFiles('/api/upload', e.currentTarget.files, onProgress);
if (response.status >= 400) {
  throw new Error(`File upload failed - Status code: ${response.status}`);
}
console.log('Response:', response.body);

*/
