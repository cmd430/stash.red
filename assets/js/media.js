document.addEventListener('DOMContentLoaded', () => {
  loadPollyfills(() => {
    initializeVideoPlayers()
    initializeAudioPlayers()
    initializeActions()
  })
} , false)

function loadPollyfills(cb) {
  let fullscreenAPI = document.createElement('script')
  fullscreenAPI.src = 'https://cdn.jsdelivr.net/gh/neovov/Fullscreen-API-Polyfill@master/fullscreen-api-polyfill.min.js'
  document.head.appendChild(fullscreenAPI)
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

    // View on seperate page (hide if viewing the file page)
    if (location.href.includes('/f/')) {
      control__breakout.setAttribute('style', 'display: none;')
    }

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
    let control__breakout = controls.querySelector('.control__breakout')

    audio.__mute = false

    // Visualizer
    const waveSize = 6
    let audioCtx = new AudioContext()
    let analyser = audioCtx.createAnalyser()
    source = audioCtx.createMediaElementSource(audio)
    source.connect(analyser)
    analyser.connect(audioCtx.destination)
    analyser.fftSize = 2048
    let bufferLength = analyser.frequencyBinCount
    let dataArray = new Uint8Array(bufferLength)
    let canvas = player.querySelector('canvas')
    let canvasCtx = canvas.getContext('2d')
    function renderFrame() {
      canvasCtx.clearRect(0, 0, canvas.width, canvas.height)
      requestAnimationFrame(renderFrame)
      analyser.getByteTimeDomainData(dataArray)
      canvasCtx.lineWidth = waveSize
      canvasCtx.strokeStyle = 'rgb(0, 0, 0)'
      canvasCtx.beginPath()
      let sliceWidth = canvas.width * 1 / bufferLength
      let x = 0
      for(let i = 0; i < bufferLength; i++) {
        let v = dataArray[i] / 128.0
        let y = v * canvas.height / 2
        if(i === 0) {
          canvasCtx.moveTo(x, y)
        } else {
          canvasCtx.lineTo(x, y)
        }
        x += sliceWidth
      }
      canvasCtx.lineTo(canvas.width, canvas.height / 2)
      canvasCtx.stroke()
      canvasCtx.lineWidth = waveSize / 2
      canvasCtx.strokeStyle = 'rgb(255, 255, 255)'
      canvasCtx.stroke()
    }
    renderFrame()
    let events = [
      'ended',
      'pause',
      'play'
    ].forEach(event => {
      audio.addEventListener(event, () => {
        if (audio.paused || audio.ended) {
          canvas.classList.add('invisible')
        } else {
          audioCtx.resume()
          canvas.classList.remove('invisible')
        }
      })
    })

    // View on seperate page (hide if viewing the file page)
    if (location.href.includes('/f/')) {
      control__breakout.setAttribute('style', 'display: none;')
      createCSSSelector('.title, .artist', 'width: calc(100% - 20px) !important;')
    }

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
    document.dispatchEvent(deleteEvent)
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
        url: e.dataset ? e.dataset.url : e.srcElement.parentElement.dataset.url,
        username: e.dataset ? e.dataset.username : e.srcElement.parentElement.dataset.username
      })
    })
  })
  // Album Delete
  document.querySelectorAll('.album__delete').forEach(action__delete => {
    action__delete.addEventListener('click', e => {
      document.querySelector('.blackout').classList.add('delete')
      deleteItem({
        url: e.dataset ? e.dataset.url : e.srcElement.parentElement.dataset.url,
        username: e.dataset ? e.dataset.username : e.srcElement.parentElement.dataset.username
      })
    })
  })
  let deleteItem = params => {
    let cancelDelete = () => {
      document.removeEventListener('delete', sendReq)
      document.removeEventListener('cancel_delete', cancelReq)
    }
    let sendDelete = () => {
      let request = new XMLHttpRequest()
      request.onreadystatechange = () => {
        if (request.readyState === 4) {
          if (request.status === 200) {
            if (window.location.href.includes('/a/')) {
              if (params.url.includes('/a/')) {
                redirect = params.url.replace('/a/', '/u/')
                redirect = redirect.substr(0, redirect.lastIndexOf('/') + 1)
                redirect = redirect + params.username
                return window.location = redirect
              } else if (params.url.includes('/f/')) {
                let videos = document.querySelectorAll('.video__player').length
                let audios = document.querySelectorAll('.audio__player').length
                let images = document.querySelectorAll('.image').length
                let items = videos + audios + images
                if (items === 1) {
                  redirect = params.url.replace('/f/', '/u/')
                  redirect = redirect.substr(0, redirect.lastIndexOf('/') + 1)
                  redirect = redirect + params.username
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
      request.open('DELETE', `${params.url}`, true)
      request.send('')
      document.removeEventListener('delete', sendDelete)
    }
    document.addEventListener('delete', sendDelete)
    document.addEventListener('cancel_delete', cancelDelete)
  }

  // Album Update
  document.querySelectorAll('.album__title').forEach(action__update => {
    action__update.addEventListener('click', e => {
      if (e.target === action__update) {
        action__update.contentEditable = 'true'
      }
    })
  })
  let updateItem = params => {
    let cancelUpdate = () => {
      document.removeEventListener('update', sendReq)
      document.removeEventListener('cancel_update', cancelReq)
    }
    let sendUpdate = () => {
      let request = new XMLHttpRequest()
      request.onreadystatechange = () => {
        if (request.readyState === 4) {
          if (request.status === 200) {
            return window.location.reload()
          } else {
            return console.error(request.responseText)
          }
        }
      }
      request.upload.onerror = err => {
        return console.error(err)
      }
      request.open('PATCH', `${params.url}`, true)
      request.send('')
      document.removeEventListener('update', sendUpdate)
    }
  }
}