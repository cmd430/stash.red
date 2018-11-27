document.addEventListener('DOMContentLoaded', () => {

  let file__picker = document.querySelector('#files')
  let file__dropzone = document.querySelector('#dropzone')
  let file_dropzonetext = document.querySelector('#dropstate')

  let button__uploads = document.querySelector('#uploadsBtn')
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

  let = userUploads = () => {
    let username = localStorage.getItem('Username') || ''
    if (username !== '') {
      button__uploads.classList.remove('hidden')
      button__uploads.addEventListener('click', e => {
        location.href = `${location.protocol}//${location.host}/u/${username}`
      })
    }
  }
  userUploads()

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
    userUploads()
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

  window.addEventListener('paste', e => {
    if (progress__bar.classList.contains('hidden')) {
      let clipboardItems = e.clipboardData.items
      let blobs = []
      for (clipboardIndex in clipboardItems) {
        let clipboardItem = clipboardItems[clipboardIndex]
        if (clipboardItem.kind == 'file') {
          if (clipboardItem.type.includes('image') || clipboardItem.type.includes('video') || clipboardItem.type.includes('audio')) {
            blobs.push(clipboardItem.getAsFile())
          }
        } else if (clipboardItem.kind == 'string' && clipboardItem.type == 'text/plain') {
          clipboardItem.getAsString(text => {
            if (isValidURL(text)) {
              preProgress('Fetching: 0%')
              let request = new XMLHttpRequest()
              request.onreadystatechange = () => {
                if (request.readyState === 4 && request.status === 200) {
                  let blob = new Blob([request.response], {
                    type: request.getResponseHeader('Content-Type')
                  })
                  console.log(blob)
                  if (blob.type.includes('image') || blob.type.includes('video') || blob.type.includes('audio')) {
                    blobs.push(blob)
                    fakeForm(blobs)
                  }
                }
              }
              request.onprogress = e => {
                if (e.lengthComputable) {
                  let percentage = (e.loaded / e.total) * 100
                  progress__text.textContent = `Fetching: ${Math.round(percentage)}%`
                  progress__fill.setAttribute('style', `width: ${percentage}%;`)
                } else {
                  // Can't compute size :/
                  preProgress('Fetching...')
                }
              }
              request.onerror = e => {
                // Mostly Ignore error (for now)
                console.error(e)
              }
              request.open('GET', `https://cors-anywhere.herokuapp.com/${text}`, true)
              request.responseType = 'blob';
              request.send()
            }
          })
        }
      }
      fakeForm(blobs)
    }
  })

  let fakeForm = (blobs) => {
    let fakeForm = new FormData()
    if (blobs.length > 0) {
      blobs.forEach(blob => {
        fakeForm.append('file', blob, `${blob.name}`)
      })
      uploadFiles(fakeForm)
    }
  }

  let preProgress = (statusText) => {
    if (button__settings.classList.contains('active')) {
      button__settings.click()
    }
    button__settings.classList.add('hidden')
    button__uploads.classList.add('hidden')
    file_dropzonetext.classList.add('hidden')
    progress__text.textContent = statusText
    progress__bar.classList.remove('hidden')
    setTimeout(() => {
      progress__bar.classList.remove('invisible')
    }, 0)
  }

  let uploadFiles = formData => {
    preProgress('Uploading: 0%')
    if (button__settings.classList.contains('active')) {
      button__settings.click()
    }
    button__settings.classList.add('hidden')
    button__uploads.classList.add('hidden')
    file_dropzonetext.classList.add('hidden')
    progress__bar.classList.remove('hidden')
    setTimeout(() => {
      progress__bar.classList.remove('invisible')
    }, 0)
    let request = new XMLHttpRequest()
    request.onreadystatechange = () => {
      if (request.readyState === 4 && request.status === 200) {
        let responseJSON = JSON.parse(request.responseText)
        localStorage.setItem('Username', responseJSON.meta.uploaded.by)
        let redirect = copyText = `${responseJSON.path}`
        if (setting__copylink.checked) {
          if (responseJSON.meta.type === 'file' && responseJSON.meta.mimetype.includes('image')) {
            copyText = `${responseJSON.directpath}`
          }
          try {
            navigator.clipboard.writeText(`${copyText}`)
            .catch(err => {
              // Mostly Ignore error (for now)
              console.error('Could not copy to clipboard')
            })
          } catch (err) {
            // Mostly Ignore error (for now)
            console.error('Could not copy to clipboard')
          }
        }
        location.href = redirect
      }
    }
    request.upload.onprogress = e => {
      if (e.lengthComputable) {
        let percentage = (e.loaded / e.total) * 100
        progress__text.textContent = `Uploading: ${Math.round(percentage)}%`
        progress__fill.setAttribute('style', `width: ${percentage}%;`)
      }
    }
    request.onerror = e => {
      // Mostly Ignore error (for now)
      console.error(e)
    }
    request.open('POST', '/upload', true)
    request.setRequestHeader('Authorization', localStorage.getItem('AuthorizationKey'))
    request.send(formData)
  }
})

function isValidURL(str) {
  let a  = document.createElement('a')
  a.href = str
  return (a.host && a.host != location.host)
}