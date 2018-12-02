function formatTime (seconds, guide) {
  // https://github.com/videojs/video.js/blob/master/src/js/utils/format-time.js#L21
  seconds = seconds < 0 ? 0 : seconds
  let s = Math.floor(seconds % 60)
  let m = Math.floor(seconds / 60 % 60)
  let h = Math.floor(seconds / 3600)
  const gm = Math.floor(guide / 60 % 60)
  const gh = Math.floor(guide / 3600)

  if (isNaN(seconds) || seconds === Infinity) {
    h = m = s = '-'
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