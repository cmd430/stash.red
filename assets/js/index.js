document.addEventListener('DOMContentLoaded', () => {

  let file__picker = document.querySelector('#files')
  let file__dropzone = document.querySelector('#dropzone')
  let file_dropzonetext = document.querySelector('#dropstate')

  let buttons = document.querySelector('#buttons')
  let button__settings = document.querySelector('#settingsBtn')
  let panel__settings = document.querySelector('#settings')

  let setting__copylink = document.querySelector('#cltcb')
  let setting__directlink = document.querySelector('#dlfi')
  let setting__private = document.querySelector('#pu')

  let progress__bar = document.querySelector('#progress')
  let progress__fill = progress__bar.querySelector('#fill')
  let progress__text = progress__bar.querySelector('#text')

  if (file__picker.files.length > 0) {
    // Clear selected files
    // after Browser Back
    file__picker.value = ''
  }

  if (button__settings) {
    button__settings.addEventListener('click', e => {
      if (button__settings.classList.contains('active')) {
        button__settings.classList.remove('active')
        panel__settings.classList.add('invisible')
        setTimeout(() => {
          panel__settings.classList.add('hidden')
        }, 200)
      } else {
        button__settings.classList.add('active')
        panel__settings.classList.remove('hidden')
        setTimeout(() => {
          // Hack to make shit work
          panel__settings.classList.remove('invisible')
        }, 0)
      }
    })
  }

  setting__copylink.checked = JSON.parse(localStorage.getItem('AutoCopyLink')) || false
  setting__directlink.checked = JSON.parse(localStorage.getItem('CopyDirectLink')) || false

  setting__copylink.addEventListener('change', e => {
    localStorage.setItem('AutoCopyLink', setting__copylink.checked)
  })
  setting__directlink.addEventListener('change', e => {
    localStorage.setItem('CopyDirectLink', setting__directlink.checked)
  })

  file__dropzone.addEventListener('click', e => {
    if (file__picker.files.length === 0) {
      file__picker.click()
    }
  })
  file__dropzone.addEventListener('dragover', e => {
    e.preventDefault()
  })
  file__dropzone.addEventListener('dragenter', e => {
    e.preventDefault()
  })
  file__dropzone.addEventListener('drop', e => {
    if (e.dataTransfer.files.length > 0) {
      uploadFiles(e.dataTransfer.files)
    }
    e.preventDefault()
  })
  file__picker.addEventListener('change', e => {
    if (file__picker.files.length > 0) {
      uploadFiles(file__picker.files)
    }
  })

  window.addEventListener('paste', async e => {
    if (progress__bar.classList.contains('hidden')) {
      let clipboardItems = e.clipboardData.items
      for (clipboardIndex in clipboardItems) {
        let clipboardItem = clipboardItems[clipboardIndex]
        if (clipboardItem.kind === 'file') {
          if (clipboardItem.type.includes('image') || clipboardItem.type.includes('video') || clipboardItem.type.includes('audio')) {
            uploadFiles(clipboardItem.getAsFile())
          }
        } else if (clipboardItem.kind === 'string' && clipboardItem.type === 'text/plain') {
          clipboardItem.getAsString(text => {
            uploadFiles(text)
          })
        }
      }
    }
  })

  function error (error = {}) {
    let message = 'Unknown Error'
    if (error.error) {
      message = `${error.status}: ${error.error}`
    } else if (error.message) {
      message = error.message
      if (error.status) {
        message = `${error.status}: ${message}`
      }
    }
    progress__text.textContent = message
    progress__fill.setAttribute('style', 'width: 100%;')
    progress__bar.classList.remove('proc')
    progress__bar.classList.remove('warn')
    progress__bar.classList.add('error')
  }

  function warn (warn) {
    let message = 'Unknown Warning'
    if (warn) {
      message = warn
    }
    progress__text.textContent = message
    progress__fill.setAttribute('style', 'width: 100%;')
    progress__bar.classList.remove('proc')
    progress__bar.classList.remove('error')
    progress__bar.classList.add('warn')
  }

  function prepare (statusText) {
    if (button__settings) {
      if (button__settings.classList.contains('active')) {
        button__settings.click()
      }
      button__settings.classList.add('hidden')
    }
    buttons.classList.add('invisible')
       setTimeout(() => {
        buttons.classList.add('hidden')
    }, 200)
    file_dropzonetext.classList.add('hidden')
    progress__text.textContent = statusText
    progress__fill.removeAttribute('style')
    progress__bar.classList.remove('hidden')
    setTimeout(() => {
      progress__bar.classList.remove('invisible')
    }, 0)
  }

  async function uploadFiles (data) {
    prepare('Preparing Uploads')
    let formData = new FormData()
    if (data instanceof FileList) {
      let fileCount = data.length
      for (var x = 0; x < fileCount; x++) {
        let blob = data[x]
        let filename = blob.name
        formData.append('files[]', blob, filename)
      }
    } else if (data instanceof Blob || data instanceof File) {
      let filename = data.name || `unknown.${data.type.split('/').pop()}`
      let blob = data
      formData.append('files[]', blob, filename)
    } else if (typeof data === 'string') {
      formData.append('url', data)
    }
    formData.append('options', JSON.stringify({
      public: !setting__private.checked,
      title: null //can upload with a title set for albums by passing in a string here
    }))
    prepare('Uploading: 0%')
    upload(formData)
    .then(response => {
      let redirect = copyText = `${response.path}`
      if (setting__copylink.checked) {
        if (response.meta.type === 'image') {
          copyText = `${response.directpath}`
        }
        if (navigator.clipboard) {
          navigator.clipboard.writeText(`${copyText}`)
          .catch(err => {
            // Couldn't copy to clipboard
            // Maybe we lost focus?
            console.error(err)
          })
        }
      }
      location.href = redirect
    })
    .catch(err => {
      error(err)
    })
  }

  async function upload(formData) {
    return new Promise((resolve, reject) => {
      let request = new XMLHttpRequest()
      request.onreadystatechange = () => {
        if (request.readyState === 4) {
          if (request.status === 200) {
            return resolve(JSON.parse(request.responseText))
          } else {
            return reject(JSON.parse(request.responseText))
          }
        }
      }
      request.upload.onprogress = e => {
        if (e.lengthComputable) {
          let percentage = (e.loaded / e.total) * 100
          progress__text.textContent = `Uploading: ${Math.round(percentage)}%`
          progress__fill.setAttribute('style', `width: ${percentage}%;`)
          if (percentage === 100) {
            progress__text.textContent = `Processing`
            progress__bar.classList.add('proc')
          }
        } else {
          warn('Uploading: Progress Unavailable')
        }
      }
      request.upload.onerror = err => {
        return reject(err)
      }
      request.open('POST', '/upload', true)
      request.send(formData)
    })
  }

})

function isValidURL(str) {
  let a  = document.createElement('a')
  a.href = str
  return (a.host && a.host !== location.host)
}