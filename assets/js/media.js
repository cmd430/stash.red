document.addEventListener('DOMContentLoaded', () => {
  initialiseVideoPlayers()
  initialiseAudioPlayers()
} , false)


function initialiseVideoPlayers () {
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
      if (document.webkitFullscreenElement) {
        document.webkitExitFullscreen()
      } else {
        player.webkitRequestFullscreen()
      }
    })
    let control__fullscreen__icon = control__fullscreen.querySelector('i')
    document.addEventListener('webkitfullscreenchange', () => {
      if (document.webkitFullscreenElement) {
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
      if (document.webkitFullscreenElement) {
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
      playback__playPause.click();
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
      volume__control.setAttribute('style', `background-image: linear-gradient(to right, rgb(56, 136, 234) 0%, rgb(56, 136, 234) ${percent}%, rgb(0,0,0) ${percent}%, rgb(0,0,0) 100%)`)
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
      playback__time.textContent = formatTime(0, video.duration)
    })
    video.addEventListener('timeupdate', e => {
      playback__time.textContent = formatTime(video.currentTime, video.duration)
      let percent = (video.currentTime / video.duration) * 100
      playback__progress.setAttribute('style', `width: ${percent}%;`)
    })

    // Seek
    function seek (e) {
      let multiplier = (e.offsetX / playback__bar.clientWidth)
      playback__progress.setAttribute('style', `width: ${multiplier * 100}%;`)
      video.currentTime = video.duration * multiplier
    }
    playback__bar.addEventListener('mousedown', e => {
      seek(e)
      this.addEventListener('mousemove', seek)
      playback__progress.classList.add('no_transition')
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

function initialiseAudioPlayers () {
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

    // View on seperate page (hide if viewing the file page)
    if (location.href.includes('/f/')) {
      control__breakout.setAttribute('style', 'display: none;')
      createCSSSelector('.title, .artist', 'width: 100% !important;')
    }

    // Play | Pasue | Replay
    let playback__playPause__icon = playback__playPause.querySelector('i')
    playback__playPause.addEventListener('click', e => {
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
    audio.addEventListener('click', e => {
      playback__playPause.click();
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
      volume__control.setAttribute('style', `background-image: linear-gradient(to right, rgb(56, 136, 234) 0%, rgb(56, 136, 234) ${percent}%, rgb(0,0,0) ${percent}%, rgb(0,0,0) 100%)`)
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
      playback__time.textContent = formatTime(0, audio.duration)
    })
    audio.addEventListener('timeupdate', e => {
      playback__time.textContent = formatTime(audio.currentTime, audio.duration)
      let percent = (audio.currentTime / audio.duration) * 100
      playback__progress.setAttribute('style', `width: ${percent}%;`)
    })

    // Seek
    function seek (e) {
      let multiplier = (e.offsetX / playback__bar.clientWidth)
      playback__progress.setAttribute('style', `width: ${multiplier * 100}%;`)
      audio.currentTime = audio.duration * multiplier
    }
    playback__bar.addEventListener('mousedown', e => {
      seek(e)
      this.addEventListener('mousemove', seek)
      playback__progress.classList.add('no_transition')
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