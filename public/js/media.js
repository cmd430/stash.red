document.addEventListener('DOMContentLoaded', () => {
  loadPollyfills(() => {
    initializeVideoPlayers()
    initializeAudioPlayers()
    initializeTextAreas()
    initializeActions()
  })
}, false)

function loadPollyfills (cb) {
  let fullscreenAPI = document.createElement('script')
  fullscreenAPI.src = 'https://cdn.jsdelivr.net/gh/neovov/Fullscreen-API-Polyfill@master/fullscreen-api-polyfill.min.js'
  document.head.appendChild(fullscreenAPI)

  let ID3 = document.createElement('script')
  ID3.src = 'https://cdnjs.cloudflare.com/ajax/libs/jsmediatags/3.9.0/jsmediatags.js'
  ID3.addEventListener('load', loadAudioMeta)
  document.head.appendChild(ID3)

  cb()
}

function initializeVideoPlayers () {
  document.querySelectorAll('.video__player').forEach(player => {
    let video = player.querySelector('video')
    let controls = player.querySelector('.video__controls')
    let playback__playPause = controls.querySelector('.playback__playPause')
    let volume__control = controls.querySelector('.volume__control')
    let volume__muteUnmute = controls.querySelector('.volume__muteUnmute')
    let playback__bar = controls.querySelector('.playback__bar')
    let playback__progress = controls.querySelector('.playback__progress')
    let playback__buffer = controls.querySelector('.playback__buffer')
    let playback__time = controls.querySelector('.playback__time')
    let playback__length = controls.querySelector('.playback__length')
    let control__fullscreen = controls.querySelector('.control__fullscreen')
    let control__breakout = controls.querySelector('.control__breakout')

    video.__mute = false

    // Fullscreen
    if (!window.thread) {
      window.thread = null
    }
    control__fullscreen.addEventListener('click', e => {
      if (document.fullscreenElement) {
        document.exitFullscreen()
      } else {
        player.requestFullscreen()
      }
    })
    let control__fullscreen__icon = control__fullscreen.querySelector('i')
    document.addEventListener('fullscreenchange', () => {
      if (document.fullscreenElement) {
        if (!location.href.includes('/f/')) {
          control__breakout.setAttribute('style', 'display: none;')
        }
        control__fullscreen__icon.classList.remove('icon-resize-full')
        control__fullscreen__icon.classList.add('icon-resize-small')
        control__fullscreen.setAttribute('title', 'Exit Fullscreen')
      } else {
        if (!location.href.includes('/f/')) {
          control__breakout.removeAttribute('style')
        }
        control__fullscreen__icon.classList.remove('icon-resize-small')
        control__fullscreen__icon.classList.add('icon-resize-full')
        control__fullscreen.setAttribute('title', 'Fullscreen')
        clearTimeout(thread)
        controls.removeAttribute('style')
      }
    })
    document.addEventListener('mousemove', () => {
      if (document.fullscreenElement) {
        controls.removeAttribute('style')
          clearTimeout(thread)
          window.thread = setTimeout(() => {
            controls.setAttribute('style', 'margin: 0 0 -42px 0;')
          }, 1500)
      }
    })

    // Play | Pasue | Replay
    let playback__playPause__icon = playback__playPause.querySelector('i')
    playback__playPause.addEventListener('click', e => {
      window.dispatchEvent(new CustomEvent('pause_players', {
        detail: {
          player: video
        }
      }))
      if (video.paused || video.ended) {
        if (video.ended) {
          video.currentTime = 0
          playback__playPause__icon.classList.remove('icon-cw')
        }
        playback__playPause.setAttribute('title', 'Pause')
        playback__playPause__icon.classList.remove('icon-play')
        playback__playPause__icon.classList.add('icon-pause')
        video.play()
      } else {
        playback__playPause.setAttribute('title', 'Play')
        playback__playPause__icon.classList.remove('icon-pause')
        playback__playPause__icon.classList.add('icon-play')
        video.pause()
      }
    })
    video.addEventListener('ended', e => {
      playback__playPause.setAttribute('title', 'Replay')
      playback__playPause__icon.classList.remove('icon-pause')
      playback__playPause__icon.classList.remove('icon-play')
      playback__playPause__icon.classList.add('icon-cw')
    })
    video.addEventListener('click', e => {
      playback__playPause.click()
    })
    window.addEventListener('pause_players', e => {
      if (!video.paused && e.detail.player !== video) {
        playback__playPause.click()
      }
    })

    // Volume / Mute
    volume__muteUnmute__icon = volume__muteUnmute.querySelector('i')
    video.addEventListener('volumechange', e => {
      if (video.muted) {
        volume__control.value = 0
        volume__muteUnmute.setAttribute('title', 'Unmute')
        volume__muteUnmute__icon.classList.remove('icon-volume-up')
        volume__muteUnmute__icon.classList.remove('icon-volume-down')
        volume__muteUnmute__icon.classList.add('icon-volume-off')
      } else {
        volume__control.value = video.volume
        volume__muteUnmute.setAttribute('title', 'Mute')
        volume__muteUnmute__icon.classList.remove('icon-volume-off')
        if (video.volume === 0) {
          volume__muteUnmute__icon.classList.remove('icon-volume-down')
          volume__muteUnmute__icon.classList.remove('icon-volume-up')
          volume__muteUnmute__icon.classList.add('icon-volume-off')
        } else if (video.volume >= 0.5) {
          volume__muteUnmute__icon.classList.remove('icon-volume-down')
          volume__muteUnmute__icon.classList.add('icon-volume-up')
        } else {
          volume__muteUnmute__icon.classList.remove('icon-volume-up')
          volume__muteUnmute__icon.classList.add('icon-volume-down')
        }
      }
      let percent = volume__control.value * 100
      let vol_css = getCSSRule('.video__player .video__controls .playback__volume .volume__control', 1).style.backgroundImage
      vol_css = vol_css.replace(`100%`, `${percent}%`).replace(`100%`, `${percent}%`)
      volume__control.setAttribute('style', `background-image: ${vol_css}`)
    })
    volume__control.addEventListener('input', e => {
      if (!video.__mute) {
        if (video.muted) {
          video.muted = false
        }
        video.volume = volume__control.value
      }
    })
    volume__muteUnmute.addEventListener('click', e => {
      video.__mute = true
      video.muted = !video.muted
      setTimeout(() => {
        video.__mute = false
      }, 10)
    })

    // Progress
    video.addEventListener('loadedmetadata', e => {
      playback__progress.max = video.duration
      playback__length.textContent = formatTime(video.duration)
      playback__time.textContent = formatTime(video.duration === Infinity ? NaN : video.currentTime, video.duration)
    })
    video.addEventListener('timeupdate', e => {
      playback__time.textContent = formatTime(video.duration === Infinity ? NaN : video.currentTime, video.duration)
      let percent = (video.currentTime / video.duration) * 100
      playback__progress.setAttribute('style', `width: ${percent}%;`)
    })

    // Seek
    function seek (e) {
      let multiplier = (e.offsetX / playback__bar.clientWidth)
      if ((video.duration * multiplier) >= 0 && (video.duration * multiplier) <= video.duration) {
        playback__progress.setAttribute('style', `width: ${multiplier * 100}%;`)
        video.currentTime = video.duration * multiplier
      }
    }
    playback__bar.addEventListener('mousedown', e => {
      if (e.button === 0) {
        seek(e)
        this.addEventListener('mousemove', seek)
        playback__progress.classList.add('no_transition')
      }
    })
    document.addEventListener('mouseup', e => {
      this.removeEventListener('mousemove', seek)
      playback__progress.classList.remove('no_transition')
    })

    // Buffer
    video.addEventListener('loadedmetadata', () => {
      let update = () => {
        if (video.buffered.length > 0) {
          let duration =  video.duration
          let bufferedEnd = video.buffered.end(video.buffered.length - 1)
          if (duration > 0) {
            playback__buffer.setAttribute('style', `width: ${(bufferedEnd / duration) * 100}%`)
          }
        }
      }
      video.addEventListener('progress', update)
      update()
    })

    // https://developer.mozilla.org/en-US/docs/Web/Guide/Events/Media_events
    // https://developer.mozilla.org/en-US/docs/Web/Apps/Fundamentals/Audio_and_video_delivery/Video_player_styling_basics
  })
}

function initializeAudioPlayers () {
  document.querySelectorAll('.audio__player').forEach(player => {
    let audio = player.querySelector('audio')
    let controls = player.querySelector('.audio__controls')
    let playback__playPause = controls.querySelector('.playback__playPause')
    let volume__control = controls.querySelector('.volume__control')
    let volume__muteUnmute = controls.querySelector('.volume__muteUnmute')
    let playback__bar = controls.querySelector('.playback__bar')
    let playback__progress = controls.querySelector('.playback__progress')
    let playback__buffer = controls.querySelector('.playback__buffer')
    let playback__time = controls.querySelector('.playback__time')
    let playback__length = controls.querySelector('.playback__length')

    audio.__mute = false

    // Play | Pasue | Replay
    let playback__playPause__icon = playback__playPause.querySelector('i')
    playback__playPause.addEventListener('click', e => {
      window.dispatchEvent(new CustomEvent('pause_players', {
        detail: {
          player: audio
        }
      }))
      if (audio.paused || audio.ended) {
        if (audio.ended) {
          audio.currentTime = 0
          playback__playPause__icon.classList.remove('icon-cw')
        }
        playback__playPause.setAttribute('title', 'Pause')
        playback__playPause__icon.classList.remove('icon-play')
        playback__playPause__icon.classList.add('icon-pause')
        audio.play()
      } else {
        playback__playPause.setAttribute('title', 'Play')
        playback__playPause__icon.classList.remove('icon-pause')
        playback__playPause__icon.classList.add('icon-play')
        audio.pause()
      }
    })
    audio.addEventListener('ended', e => {
      playback__playPause.setAttribute('title', 'Replay')
      playback__playPause__icon.classList.remove('icon-pause')
      playback__playPause__icon.classList.remove('icon-play')
      playback__playPause__icon.classList.add('icon-cw')
    })
    let audioart = player.querySelector('.audio__artwork')
    audioart.addEventListener('click', e => {
      playback__playPause.click()
    })
    window.addEventListener('pause_players', e => {
      if (!audio.paused && e.detail.player !== audio) {
        playback__playPause.click()
      }
    })
    audioart.querySelector('img').addEventListener('error', e => {
      e.target.src = `/img/thumbnails/audio.png`
    })

    // Volume / Mute
    volume__muteUnmute__icon = volume__muteUnmute.querySelector('i')
    audio.addEventListener('volumechange', e => {
      if (audio.muted) {
        volume__control.value = 0
        volume__muteUnmute.setAttribute('title', 'Unmute')
        volume__muteUnmute__icon.classList.remove('icon-volume-up')
        volume__muteUnmute__icon.classList.remove('icon-volume-down')
        volume__muteUnmute__icon.classList.add('icon-volume-off')
      } else {
        volume__control.value = audio.volume
        volume__muteUnmute.setAttribute('title', 'Mute')
        volume__muteUnmute__icon.classList.remove('icon-volume-off')
        if (audio.volume === 0) {
          volume__muteUnmute__icon.classList.remove('icon-volume-down')
          volume__muteUnmute__icon.classList.remove('icon-volume-up')
          volume__muteUnmute__icon.classList.add('icon-volume-off')
        } else if (audio.volume >= 0.5) {
          volume__muteUnmute__icon.classList.remove('icon-volume-down')
          volume__muteUnmute__icon.classList.add('icon-volume-up')
        } else {
          volume__muteUnmute__icon.classList.remove('icon-volume-up')
          volume__muteUnmute__icon.classList.add('icon-volume-down')
        }
      }
      let percent = volume__control.value * 100
      let vol_css = getCSSRule('.audio__player .audio__info .audio__controls .playback__volume .volume__control', 1).style.backgroundImage
      vol_css = vol_css.replace(`100%`, `${percent}%`).replace(`100%`, `${percent}%`)
      volume__control.setAttribute('style', `background-image: ${vol_css}`)
    })
    volume__control.addEventListener('input', e => {
      if (!audio.__mute) {
        if (audio.muted) {
          audio.muted = false
        }
        audio.volume = volume__control.value
      }
    })
    volume__muteUnmute.addEventListener('click', e => {
      audio.__mute = true
      audio.muted = !audio.muted
      setTimeout(() => {
        audio.__mute = false
      }, 10)
    })

    // Progress
    audio.addEventListener('loadedmetadata', e => {
      playback__progress.max = audio.duration
      playback__length.textContent = formatTime(audio.duration)
      playback__time.textContent = formatTime(audio.duration === Infinity ? NaN : audio.currentTime, audio.duration)
    })
    audio.addEventListener('timeupdate', e => {
      playback__time.textContent = formatTime(audio.duration === Infinity ? NaN : audio.currentTime, audio.duration)
      let percent = (audio.currentTime / audio.duration) * 100
      playback__progress.setAttribute('style', `width: ${percent}%;`)
    })

    // Seek
    function seek (e) {
      let multiplier = (e.offsetX / playback__bar.clientWidth)
      if ((audio.duration * multiplier) >= 0 && (audio.duration * multiplier) <= audio.duration) {
        playback__progress.setAttribute('style', `width: ${multiplier * 100}%;`)
        audio.currentTime = audio.duration * multiplier
      }
    }
    playback__bar.addEventListener('mousedown', e => {
      if (e.button === 0) {
        seek(e)
        this.addEventListener('mousemove', seek)
        playback__progress.classList.add('no_transition')
      }
    })
    document.addEventListener('mouseup', e => {
      this.removeEventListener('mousemove', seek)
      playback__progress.classList.remove('no_transition')
    })

    // Buffer
    audio.addEventListener('loadedmetadata', () => {
      let update = () => {
        if (audio.buffered.length > 0) {
          let duration =  audio.duration
          let bufferedEnd = audio.buffered.end(audio.buffered.length - 1)
          if (duration > 0) {
            playback__buffer.setAttribute('style', `width: ${(bufferedEnd / duration) * 100}%`)
          }
        }
      }
      audio.addEventListener('progress', update)
      update()
    })
  })
}

function initializeTextAreas() {
  document.querySelectorAll('.text code').forEach(textArea => {
    new Promise((resolve, reject) => {
      let request = new XMLHttpRequest()
      request.onreadystatechange = () => {
        if (request.readyState === 4) {
          if (request.status === 200) {
            return resolve(request.responseText)
          } else {
            return resolve('')
          }
        }
      }
      request.open('GET', textArea.textContent, true)
      request.send('')
    })
    .then(text => {
      textArea.textContent = text
    })
  })
}

function initializeActions() {
  // Confirm Dialog
  let updateEvent = new Event('update')
  let cancelUpdateEvent = new Event('cancel_update')
  let deleteEvent = new Event('delete')
  let cancelDeleteEvent = new Event('cancel_delete')
  document.querySelector('#delete_modal .delete').addEventListener('click', () => {
    document.querySelector('.blackout').classList.remove('delete')
    document.dispatchEvent(deleteEvent)
  })
  document.querySelector('#delete_modal .cancel').addEventListener('click', () => {
    document.querySelector('.blackout').classList.remove('delete')
    document.dispatchEvent(cancelDeleteEvent)
  })
  document.querySelector('#update_modal .update').addEventListener('click', () => {
    document.querySelector('.blackout').classList.remove('update')
    document.dispatchEvent(updateEvent)
  })
  document.querySelector('#update_modal .cancel').addEventListener('click', () => {
    document.querySelector('.blackout').classList.remove('update')
    document.dispatchEvent(cancelUpdateEvent)
  })

  // Files Delete
  document.querySelectorAll('.action__delete').forEach(action__delete => {
    action__delete.addEventListener('click', e => {
      document.querySelector('.blackout').classList.add('delete')
      deleteItem({
        url: e.dataset ? e.dataset.id : e.srcElement.parentElement.dataset.id,
        username: e.dataset ? e.dataset.username : e.srcElement.parentElement.dataset.username
      })
    })
  })
  // Album Delete
  document.querySelectorAll('.album__delete').forEach(action__delete => {
    action__delete.addEventListener('click', e => {
      document.querySelector('.blackout').classList.add('delete')
      deleteItem({
        url: e.dataset ? e.dataset.id : e.srcElement.parentElement.dataset.id,
        username: e.dataset ? e.dataset.username : e.srcElement.parentElement.dataset.username
      })
    })
  })
  let deleteItem = params => {
    document.querySelector('#delete_modal .delete').focus()
    let cancelDelete = () => {
      document.removeEventListener('delete', sendDelete)
      document.removeEventListener('cancel_delete', cancelDelete)
    }
    let sendDelete = () => {
      let request = new XMLHttpRequest()
      request.onreadystatechange = () => {
        if (request.readyState === 4) {
          if (request.status === 204 || request.status === 200) {
            if (window.location.href.includes('/a/')) {
              if (params.url.includes('/a/')) {
                redirect = params.url.replace('/a/', '/u/')
                redirect = redirect.substr(0, redirect.lastIndexOf('/') + 1)
                redirect = redirect + `${params.username}/albums`
                return window.location = redirect
              } else if (params.url.includes('/f/')) {
                let videos = document.querySelectorAll('.video__player').length
                let audios = document.querySelectorAll('.audio__player').length
                let images = document.querySelectorAll('.image').length
                let items = videos + audios + images
                if (items === 1) {
                  redirect = params.url.replace('/f/', '/u/')
                  redirect = redirect.substr(0, redirect.lastIndexOf('/') + 1)
                  redirect = redirect + `${params.username}/albums`
                  return window.location = redirect
                } else {
                  return window.location.reload()
                }
              }
            } else if (window.location.href.includes('/f/')) {
              redirect = params.url.replace('/f/', '/u/')
              redirect = redirect.substr(0, redirect.lastIndexOf('/') + 1)
              redirect = redirect + params.username
              return window.location = redirect
            } else if (window.location.href.includes('/u/')) {
              return window.location.reload()
            } else {
              return window.location = '/'
            }
          } else {
            return console.error(request.responseText)
          }
        }
      }
      request.upload.onerror = err => {
        return console.error(err)
      }
      if (params.url.includes('/undefined')) params.url = params.url.replace('/undefined', '') // TEMP FIX, not sure what causes issue
      request.open('DELETE', `${params.url}/delete`, true)
      request.send('')
      document.removeEventListener('delete', sendDelete)
      document.removeEventListener('cancel_delete', cancelDelete)
    }
    document.addEventListener('delete', sendDelete)
    document.addEventListener('cancel_delete', cancelDelete)
  }

  // Album Update
  document.querySelectorAll('header h1').forEach(action__update => {
    let input = action__update.querySelector('.album__title_input')
    if (input !== null) {
      input.addEventListener('blur', () => {
        input.classList.remove('editable')
        if (input.value !== input.dataset.title) {
          document.querySelector('.blackout').classList.add('update')
          updateItem({
            title: input.value || 'Untitled Album'
          })
        }
      })
      input.addEventListener('keyup', e => {
        e.preventDefault()
        if (e.keyCode === 13) {
          input.blur()
        }
      })
      action__update.addEventListener('click', e => {
        if (e.target === action__update) {
          input.classList.add('editable')
          input.focus()
          input.selectionStart = input.selectionEnd = input.value.length
        }
      })
    }
  })
  let updateItem = params => {
    document.querySelector('#update_modal .update').focus()
    let cancelUpdate = () => {
      document.removeEventListener('update', sendUpdate)
      document.removeEventListener('cancel_update', cancelUpdate)
    }
    let sendUpdate = () => {
      let request = new XMLHttpRequest()
      request.onreadystatechange = () => {
        if (request.readyState === 4) {
          if (request.status === 204 || request.status === 200) {
            return window.location.reload()
          } else {
            return console.error(request.responseText)
          }
        }
      }
      request.upload.onerror = err => {
        return console.error(err)
      }
      request.open('PATCH', './update', true)
      request.setRequestHeader('Content-type', 'application/json')
      request.send(JSON.stringify(params))
      document.removeEventListener('update', sendUpdate)
      document.removeEventListener('cancel_update', cancelUpdate)
    }
    document.addEventListener('update', sendUpdate)
    document.addEventListener('cancel_update', cancelUpdate)
  }
}

function loadAudioMeta () {
  document.querySelectorAll('.audio__player').forEach(player => {
    let audio = player.querySelector('audio')
    let info = player.querySelector('.audio__info')
    let audio__info__title = info.querySelector('.title')
    let audio__info__artist = info.querySelector('.artist')

    let defaultName = audio.firstElementChild.dataset.original_filename.split('.').shift()

    jsmediatags.read(audio.firstElementChild.src, {
      onSuccess: data => {
        let tags = data.tags
        if (tags) {
          audio__info__title.textContent = tags.title || defaultName
          audio__info__title.setAttribute('title', tags.title || 'Unknown Title')
          audio__info__artist.textContent = tags.artist || '\u00a0'
          audio__info__artist.setAttribute('title', tags.artist || 'Unknown Artist')
        }
      },
      onError: err => {
        audio__info__title.textContent =  defaultName
        audio__info__title.setAttribute('title', 'Unknown Title')
        audio__info__artist.textContent = '\u00a0'
        audio__info__artist.setAttribute('title', 'Unknown Artist')
      }
    })
  })
}
