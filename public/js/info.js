import prettyBytes from './vendor/pretty-bytes.js'

const totalSize = document.querySelector('#table > div > span.totalSize')

totalSize.textContent = prettyBytes(Number(totalSize.textContent), {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
})
