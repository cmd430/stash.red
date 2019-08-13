function formatTime (seconds, guide) {
  // https://github.com/videojs/video.js/blob/master/src/js/utils/format-time.js#L21
  seconds = seconds < 0 ? 0 : seconds
  let s = Math.floor(seconds % 60)
  let m = Math.floor(seconds / 60 % 60)
  let h = Math.floor(seconds / 3600)
  const gm = Math.floor(guide / 60 % 60)
  const gh = Math.floor(guide / 3600)

  if (isNaN(seconds) || seconds === Infinity) {
    return '-:--'
  }

  h = (h > 0 || gh > 0) ? h + ':' : ''
  m = (((h || gm >= 10) && m < 10) ? '0' + m : m) + ':'
  s = (s < 10) ? '0' + s : s

  return h + m + s
}

function createCSSSelector (selector, style) {
  // https://stackoverflow.com/a/8630641/4958977
  if (!document.styleSheets) return
  if (document.getElementsByTagName('head').length == 0) return
  let styleSheet,mediaType;
  if (document.styleSheets.length > 0) {
    for (let i = 0, l = document.styleSheets.length; i < l; i++) {
      if (document.styleSheets[i].disabled)
        continue
      let media = document.styleSheets[i].media
      mediaType = typeof media
      if (mediaType === 'string') {
        if (media === '' || (media.indexOf('screen') !== -1)) {
          styleSheet = document.styleSheets[i]
        }
      } else if (mediaType=='object') {
        if (media.mediaText === '' || (media.mediaText.indexOf('screen') !== -1)) {
          styleSheet = document.styleSheets[i]
        }
      }
      if (typeof styleSheet !== 'undefined')
        break
    }
  }
  if (typeof styleSheet === 'undefined') {
    let styleSheetElement = document.createElement('style')
    styleSheetElement.type = 'text/css'
    document.querySelector('head').appendChild(styleSheetElement)
    for (i = 0; i < document.styleSheets.length; i++) {
      if (document.styleSheets[i].disabled) {
        continue
      }
      styleSheet = document.styleSheets[i]
    }
    mediaType = typeof styleSheet.media
  }
  if (mediaType === 'string') {
    for (let i = 0, l = styleSheet.rules.length; i < l; i++) {
      if (styleSheet.rules[i].selectorText && styleSheet.rules[i].selectorText.toLowerCase() === selector.toLowerCase()) {
        styleSheet.rules[i].style.cssText = style
        return
      }
    }
    styleSheet.addRule(selector, style)
  } else if (mediaType === 'object') {
    let styleSheetLength = (styleSheet.cssRules) ? styleSheet.cssRules.length : 0
    for (let i = 0; i < styleSheetLength; i++) {
      if (styleSheet.cssRules[i].selectorText && styleSheet.cssRules[i].selectorText.toLowerCase() === selector.toLowerCase()) {
        styleSheet.cssRules[i].style.cssText = style
        return
      }
    }
    styleSheet.insertRule(selector + '{' + style + '}', styleSheetLength)
  }
}

function getCSSRule(selector, sheet = 0) {
  let CSS = document.styleSheets[sheet].cssRules
  if(CSS !== undefined){
    let ReturnedClass = Object.keys(CSS).map((key, index) => {
      if(CSS[index].selectorText == selector){
        return CSS[index]
      }
    }).filter(rule => {
      return rule
    })[0]
    if(ReturnedClass !== undefined){
      return ReturnedClass
    } else {
      return getCSSRule(selector, sheet + 1)
    }
  } else {
    return
  }
}

function isValidURL(str) {
  let a  = document.createElement('a')
  a.href = str
  return (a.host && a.host !== location.host)
}

document.addEventListener('DOMContentLoaded', () => {
  let isHome = true
  let isAlbum = false
  if (window.location.pathname === '/') {
    var buttons = document.querySelector('#buttons')
    var button__settings = document.querySelector('#settingsBtn')
    var setting__copylink = document.querySelector('#cltcb')
    var setting__directlink = document.querySelector('#dlfi')
    var setting__private = document.querySelector('#pu')
  } else if (window.location.pathname.startsWith('/a/')) {
    var blackout = document.querySelector('.blackout')
    isHome = false
    isAlbum = true
  }
  if (isHome || isAlbum) {
    let file__picker = document.querySelector('#files')
    let file__dropzone = document.querySelector('#dropzone')
    let file_dropzonetext = document.querySelector('#dropstate')

    let progress__bar = document.querySelector('#progress')
    let progress__fill = progress__bar.querySelector('#fill')
    let progress__text = progress__bar.querySelector('#text')

    if (file__picker.files.length > 0) {
      // Clear selected files
      // after Browser Back
      file__picker.value = ''
    }

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

    document.addEventListener('dragover', e => {
      if (!isHome && !blackout.classList.contains('dropzone')) blackout.classList.add('dropzone')
      e.preventDefault()
    })
    document.addEventListener('dragenter', e => {
      if (!isHome && !blackout.classList.contains('dropzone')) blackout.classList.add('dropzone')
      e.preventDefault()
    })
    document.addEventListener('dragleave', e => {
      if (/Chrome/.test(navigator.userAgent) && !e.clientX && !e.clientY) {
        if (!isHome && blackout.classList.contains('dropzone')) blackout.classList.remove('dropzone')
      } else if (!/Chrome/.test(navigator.userAgent)) {
        if (!isHome && blackout.classList.contains('dropzone')) blackout.classList.remove('dropzone')
      }
      e.preventDefault()
    }, false)
    document.addEventListener('drop', e => {
      if (!isHome && blackout.classList.contains('dropzone') && e.target !== file__dropzone) blackout.classList.remove('dropzone')
      e.preventDefault()
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
      if (isHome) {
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
      } else {
        if (!blackout.classList.contains('dropzone')) blackout.classList.add('dropzone')
      }
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
        public: isHome ? !setting__private.checked : true,
        title: null //can upload with a title set for albums by passing in a string here
      }))
      prepare('Uploading: 0%')
      upload(formData)
      .then(response => {
        let redirect = copyText = `${window.location.protocol}//${window.location.host}/${response.type === 'album' ? 'a' : 'f'}/${response.id}`
        if (isHome) {
          if (setting__copylink.checked) {
            if (response.type === 'image' && setting__directlink.checked) {
              copyText = `${window.location.protocol}//direct.${window.location.host}/${response.id}.${response.ext}`
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
            if (request.status === 200 || request.status === 201) {
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
        request.open('POST', './upload', true)
        request.send(formData)
      })
    }
  }
})
