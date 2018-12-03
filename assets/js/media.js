document.addEventListener('DOMContentLoaded', () => {
  fixImageRotation()
  initialiseVideoPlayers()
  initialiseAudioPlayers()
} , false)

function fixImageRotation() {
  // fix image rotation from mobile
  // photos using EXIF data
  document.querySelectorAll('.image img').forEach(img => {
    img.addEventListener('load', e => {
      EXIF.getData(img, function() {
        let orientation = EXIF.getTag(this, "Orientation")
        if(orientation === 6) {
          img.setAttribute('style', 'transform: rotate(90deg)')
        } else if(orientation === 3) {
          img.setAttribute('style', 'transform: rotate(180deg)')
        } else if(orientation === 8) {
          img.setAttribute('style', 'transform: rotate(270deg)')
        }
      })
    })
  })
}

function initialiseVideoPlayers () {
  document.querySelectorAll('.video__player').forEach(player => {
    let video = player.querySelector('video')
    let controls = player.querySelector('.video__controls')
    let control__playPause = controls.querySelector('.control__playPause')
    let volume__control = controls.querySelector('.volume__control')
    let volume__muteUnmute = controls.querySelector('.volume__muteUnmute')
    let playback__progress = controls.querySelector('.playback__progress')
    let playback__clock = controls.querySelector('.playback__clock')
    let playback__time = controls.querySelector('.playback__time')
    let playback__length = controls.querySelector('.playback__length')
    let control__fullscreen = controls.querySelector('.control__fullscreen')
    let control__breakout = controls.querySelector('.control__breakout')

    volume__control.setAttribute('style', 'background-image: linear-gradient(to right, rgb(56, 136, 234) 0%, rgb(56, 136, 234) 100%, rgb(0,0,0) 100%, rgb(0,0,0) 100%)')
    playback__progress.setAttribute('style', 'background-image: linear-gradient(to right, rgb(56, 136, 234) 0%, rgb(56, 136, 234) 0%, rgb(0,0,0) 0%, rgb(0,0,0) 100%)')
    video.__mute = false

    // Make controls fit player
    video.addEventListener('loadedmetadata', e => {
      createCSSSelector('.playback__progress', `width: calc(100% - 80px); transform: translateX(-50%); left: calc(50% - ${playback__clock.clientWidth - 18}px);`)
      createCSSSelector('.video__playback', 'width: calc(100% - 184px);')
      //fix short videos
      if (video.duration < 599) {
        createCSSSelector('.playback__progress', `width: calc(100% - 80px); transform: translateX(-50%); left: calc(50% - ${playback__clock.clientWidth - 26}px);`)
      }
      // View on seperate page
      if (location.href.includes('/f/')) {
        control__breakout.setAttribute('style', 'display: none;')
        createCSSSelector('.video__playback', 'width: calc(100% - 160px);')
      }
    })

    // Fullscreen
    control__fullscreen.addEventListener('click', e => {
      if (video.requestFullscreen) {
        video.requestFullscreen()
      } else {
        video.webkitRequestFullScreen()
      }
    })

    // Play | Pasue | Replay
    let control__playPause__icon = control__playPause.querySelector('i')
    control__playPause.addEventListener('click', e => {
      if (video.paused || video.ended) {
        if (video.ended) {
          video.currentTime = 0
          control__playPause__icon.classList.remove('icon-cw')
        }
        control__playPause.setAttribute('title', 'Pause')
        control__playPause__icon.classList.remove('icon-play')
        control__playPause__icon.classList.add('icon-pause')
        video.play()
      } else {
        control__playPause.setAttribute('title', 'Play')
        control__playPause__icon.classList.remove('icon-pause')
        control__playPause__icon.classList.add('icon-play')
        video.pause()
      }
    })
    video.addEventListener('ended', e => {
      control__playPause.setAttribute('title', 'Replay')
      control__playPause__icon.classList.remove('icon-pause')
      control__playPause__icon.classList.remove('icon-play')
      control__playPause__icon.classList.add('icon-cw')
    })
    video.addEventListener('click', e => {
      control__playPause.click();
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
      playback__progress.value = video.currentTime
      playback__time.textContent = formatTime(video.currentTime, video.duration)
      let percent = (video.currentTime / video.duration) * 100
      playback__progress.setAttribute('style', `background-image: linear-gradient(to right, rgb(56, 136, 234) 0%, rgb(56, 136, 234) ${percent}%, rgb(0,0,0) ${percent}%, rgb(0,0,0) 100%)`)
    })
    playback__progress.addEventListener('input', e => {
      video.currentTime = playback__progress.value
    })

    // https://developer.mozilla.org/en-US/docs/Web/Guide/Events/Media_events
    // https://developer.mozilla.org/en-US/docs/Web/Apps/Fundamentals/Audio_and_video_delivery/Video_player_styling_basics
  })
}

function initialiseAudioPlayers () {
  document.querySelectorAll('.audio__player').forEach(player => {
    let audio = player.querySelector('audio')
    jsmediatags.read(audio.getAttribute('src'), {
      onSuccess: function(tag) {
        console.log(tag)
      },
      onError: function(error) {
        console.log(':(', error.type, error.info)
      }
    })
  })
}