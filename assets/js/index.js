document.addEventListener('DOMContentLoaded', () => {

  let file__picker = document.querySelector('#files')
  let file__dropzone = document.querySelector('#dropzone')
  let file_dropzonetext = document.querySelector('#dropstate')

  let button__uploads = document.querySelector('#uploadsBtn')
  let button__uploads__anchor = button__uploads.querySelector('a')
  let button__settings = document.querySelector('#settingsBtn')
  let panel__settings = document.querySelector('#settings')

  let setting__copylink = document.querySelector('#cltcb')
  let setting__directlink = document.querySelector('#dlfi')
  let setting__authkey = document.querySelector('#ak')

  let progress__bar = document.querySelector('#progress')
  let progress__fill = progress__bar.querySelector('#fill')
  let progress__text = progress__bar.querySelector('#text')

  if (file__picker.files.length > 0) {
    // Clear selected files
    // after Browser Back
    file__picker.value = ''
  }

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

  function __button__uploads () {
    let username = localStorage.getItem('Username') || ''
    if (username !== '') {
      button__uploads.classList.remove('hidden')
      button__uploads__anchor.setAttribute('href', `${location.protocol}//${location.host}/u/${username}`)
    } else {
      button__uploads.classList.add('hidden')
      button__uploads__anchor.removeAttribute('href')
    }
  }
  __button__uploads()

  setting__copylink.checked = JSON.parse(localStorage.getItem('AutoCopyLink')) || false
  setting__directlink.checked = JSON.parse(localStorage.getItem('CopyDirectLink')) || false
  setting__authkey.value = localStorage.getItem('AuthorizationKey') || ''

  setting__copylink.addEventListener('change', e => {
    localStorage.setItem('AutoCopyLink', setting__copylink.checked)
  })
  setting__directlink.addEventListener('change', e => {
    localStorage.setItem('CopyDirectLink', setting__directlink.checked)
  })
  setting__authkey.addEventListener('change', e => {
    localStorage.setItem('Username', '')
    __button__uploads()
    localStorage.setItem('AuthorizationKey', setting__authkey.value)
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
    if (file__picker.files.length === 0) {
      file__picker.files = e.dataTransfer.files
    }
    e.preventDefault()
  })

  file__picker.addEventListener('change', e => {
    if (file__picker.files.length > 0) {
      let formData = new FormData()
      for (var x = 0; x < file__picker.files.length; x++) {
        formData.append('files[]', file__picker.files[x])
      }
      uploadFiles(formData)
    }
  })

  window.addEventListener('paste', async e => {
    if (progress__bar.classList.contains('hidden')) {
      let clipboardItems = e.clipboardData.items
      for (clipboardIndex in clipboardItems) {
        let clipboardItem = clipboardItems[clipboardIndex]
        if (clipboardItem.kind == 'file') {
          if (clipboardItem.type.includes('image') || clipboardItem.type.includes('video') || clipboardItem.type.includes('audio')) {
            uploadFiles(clipboardItem.getAsFile())
          }
        } else if (clipboardItem.kind == 'string' && clipboardItem.type == 'text/plain') {
          clipboardItem.getAsString(text => {
            downloadFiles(text)
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
    if (button__settings.classList.contains('active')) {
      button__settings.click()
    }
    button__settings.classList.add('hidden')
    button__uploads.classList.add('hidden')
    file_dropzonetext.classList.add('hidden')
    progress__text.textContent = statusText
    progress__fill.removeAttribute('style')
    progress__bar.classList.remove('hidden')
    setTimeout(() => {
      progress__bar.classList.remove('invisible')
    }, 0)
  }

  function downloadFiles (url) {
    if (isValidURL(url)) {
      prepare('Fetching: 0%')
      download(url)
      .then(data => {
        uploadFiles(data)
      })
      .catch(err => {
        error(err)
      })
    }
  }

  function uploadFiles (data) {
    let formData = new FormData()
    if (data[Symbol.toStringTag] === 'FileList') {
      let fileCount = data.length
      for (var x = 0; x < fileCount; x++) {
        formData.append('files[]', data[x])
      }
      data = formData
    } else if (data[Symbol.toStringTag] === 'Blob' || data[Symbol.toStringTag] === 'File') {
      let filename = data.name || `unknown.${data.type.split('/').pop()}`
      formData.append('files[]', data, filename)
      data = formData
    }
    prepare('Uploading: 0%')
    upload(data)
    .then(response => {
      localStorage.setItem('Username', response.meta.uploaded.by)
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

  async function download(url) {
    return new Promise((resolve, reject) => {
      let request = new XMLHttpRequest()
      request.onreadystatechange = () => {
        if (request.readyState === 4) {
          if (request.status === 200) {
            let blob = new Blob([request.response], {
              type: request.getResponseHeader('Content-Type')
            })
            if (blob.type.includes('image') || blob.type.includes('video') || blob.type.includes('audio')) {
              return resolve(blob)
            } else {
              return reject({
                message: 'invalid filetype'
              })
            }
          } else {
            return reject({
              message: 'invalid url'
            })
          }
        }
      }
      request.onprogress = e => {
        if (e.lengthComputable) {
          let percentage = (e.loaded / e.total) * 100
          progress__text.textContent = `Fetching: ${Math.round(percentage)}%`
          progress__fill.setAttribute('style', `width: ${percentage}%;`)
        } else {
          warn('Fetching: Progress Unavailable')
        }
      }
      request.onerror = err => {
        return reject(err)
      }
      request.open('GET', `https://gobetween.oklabs.org/pipe/${url}`, true)
      request.responseType = 'blob'
      // CORS Proxys
      //  https://gobetween.oklabs.org/pipe/
      //  https://cors-anywhere.herokuapp.com/
      request.send()
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
      request.setRequestHeader('Authorization', localStorage.getItem('AuthorizationKey'))
      request.send(formData)
    })
  }

})

function isValidURL(str) {
  let a  = document.createElement('a')
  a.href = str
  return (a.host && a.host != location.host)
}