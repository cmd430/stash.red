document.addEventListener('DOMContentLoaded', () => {

  let file__picker = document.querySelector('#files')
  let file__dropzone = document.querySelector('#dropzone')
  let file_dropzonetext = document.querySelector('#dropstate')

  let buttons = document.querySelector('#buttons')
  let button__settings = document.querySelector('#settingsBtn')
  let panel__settings = document.querySelector('#settings')

  let setting__copylink = document.querySelector('#cltcb')
  let setting__directlink = document.querySelector('#dlfi')

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
    if (file__picker.files.length === 0) {
      file__picker.files = e.dataTransfer.files
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

  async function uploadFiles (data) {
    prepare('Preparing Uploads')
    let formData = new FormData()
    if (data[Symbol.toStringTag] === 'FileList') {
      let fileCount = data.length
      for (var x = 0; x < fileCount; x++) {
        let blob = data[x]
        let filename = blob.name
        if (blob.type === 'image/jpeg') {
          blob = await fixOrientation(blob)
        }
        formData.append('files[]', blob, filename)
      }
      data = formData
    } else if (data[Symbol.toStringTag] === 'Blob' || data[Symbol.toStringTag] === 'File') {
      let filename = data.name || `unknown.${data.type.split('/').pop()}`
      let blob = data
      if (blob.type === 'image/jpeg') {
        blob = await fixOrientation(blob)
      }
      formData.append('files[]', blob, filename)
      data = formData
    }
    prepare('Uploading: 0%')
    upload(data)
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
      request.open('GET', `https://cors-anywhere.herokuapp.com/${url}`, true)
      request.responseType = 'blob'
      // Public CORS Proxys
      //  https://gobetween.oklabs.org/pipe/  <-- i think it died :(
      //  https://cors-anywhere.herokuapp.com/
      //
      //  Or host your own https://github.com/cmd430/CORS-Proxy
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
      request.send(formData)
    })
  }

})

function isValidURL(str) {
  let a  = document.createElement('a')
  a.href = str
  return (a.host && a.host != location.host)
}

function getOrientation (blob, callback) {
  let reader = new FileReader()
  reader.onload = function (e) {
    let view = new DataView(e.target.result)
    if (view.getUint16(0, false) != 0xFFD8) {
      return callback(-2)
    }
    let length = view.byteLength, offset = 2
    while (offset < length)
    {
      if (view.getUint16(offset+2, false) <= 8) {
        return callback(-1)
      }
      let marker = view.getUint16(offset, false)
      offset += 2
      if (marker == 0xFFE1) {
        if (view.getUint32(offset += 2, false) != 0x45786966) {
          return callback(-1)
        }
        let little = view.getUint16(offset += 6, false) == 0x4949
        offset += view.getUint32(offset + 4, little)
        let tags = view.getUint16(offset, little)
        offset += 2
        for (let i = 0; i < tags; i++) {
          if (view.getUint16(offset + (i * 12), little) == 0x0112) {
            return callback(view.getUint16(offset + (i * 12) + 8, little))
          }
        }
      } else if ((marker & 0xFF00) != 0xFF00) {
        break
      } else {
        offset += view.getUint16(offset, false)
      }
    }
    return callback(-1)
  }
  reader.readAsArrayBuffer(blob)
}

async function fixOrientation (blob) {
  return new Promise((resolve, reject) => {
    getOrientation(blob, orientation => {
      if (orientation === 1 || orientation === 0) {
        // Dont need to rotate
        return resolve(blob)
      }
      let img = new Image()
      img.onerror = function() {
        // let the server handle it
        return resolve(blob)
      }
      img.onload = function() {
        let width = img.width
        let height = img.height
        let canvas = document.createElement('canvas')
        let ctx = canvas.getContext('2d')
        if (4 < orientation && orientation < 9) {
          canvas.width = height
          canvas.height = width
        } else {
          canvas.width = width
          canvas.height = height
        }
        switch (orientation) {
          case 2:
            ctx.transform(-1, 0, 0, 1, width, 0)
            break
          case 3:
            ctx.transform(-1, 0, 0, -1, width, height )
            break
          case 4:
            ctx.transform(1, 0, 0, -1, 0, height )
            break
          case 5:
            ctx.transform(0, 1, 1, 0, 0, 0)
            break
          case 6:
            ctx.transform(0, 1, -1, 0, height , 0)
            break
          case 7:
            ctx.transform(0, -1, -1, 0, height , width)
            break
          case 8:
            ctx.transform(0, -1, 1, 0, 0, width)
            break
        }
        ctx.drawImage(img, 0, 0)
        canvas.toBlob(blob => {
          return resolve(blob)
        }, 'image/jpeg', 1)
      }
      img.src = URL.createObjectURL(blob)
    })
  })
}