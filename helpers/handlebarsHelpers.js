import handlebars from 'handlebars'
import handlebarsPaginate from 'handlebars-paginate'

handlebars.registerHelper('paginate', handlebarsPaginate)
handlebars.registerHelper('if_eq', function (a, b, opts) {
  // eslint-disable-next-line no-invalid-this, consistent-this
  const context = this

  return (a === b) ? opts.fn(context) : opts.inverse(context)
})
handlebars.registerHelper('if_eq_or', function (a, b, c, opts) {
  // eslint-disable-next-line no-invalid-this, consistent-this
  const context = this

  return (a === b || c === true) ? opts.fn(context) : opts.inverse(context)
})
handlebars.registerHelper('if_either_eq', function (a, b, c, opts) {
  // eslint-disable-next-line no-invalid-this, consistent-this
  const context = this

  if (c === undefined || c === null) c = 'CPMZLqNzl11MaPtSh33uML3Jz' // just a random string that should never match
  if (a === c || b === c) return opts.fn(context)

  return opts.inverse(context)
})
handlebars.registerHelper('if_either', function (a, b, opts) {
  // eslint-disable-next-line no-invalid-this, consistent-this
  const context = this
  const isDefined = a ?? b ?? undefined

  return (isDefined !== undefined) ? opts.fn(context) : opts.inverse(context)
})
handlebars.registerHelper('if_contains', function (a, b, opts) {
  // eslint-disable-next-line no-invalid-this, consistent-this
  const context = this

  return (a.includes(b)) ? opts.fn(context) : opts.inverse(context)
})
handlebars.registerHelper('repeat', (n, context) => {
  let accum = ''

  for (let i = 0; i < n; ++i) accum += context.fn(i)

  return accum
})
handlebars.registerHelper('format_title', opts => {
  const { text, split, tag: tagName } = opts.hash
  const parts = text?.split(split)
  const tag = tagName ? `<${tagName}>` : ''
  const tagEnd = tagName ? `</${tagName}>` : ''

  if (parts === 1) return text
  if (parts > 2) return `${parts.slice(0, -1).join('.')}${tag}.${parts.pop()}${tagEnd}`

  return `${parts[0]}${tag}.${parts[1]}${tagEnd}`
})
handlebars.registerHelper('json', data => JSON.stringify(data, null, 2))
handlebars.registerHelper('opengraph', (data, dataExtended) => {
  const ogData = { ...data, ...dataExtended }
  const meta = []

  // Google
  meta.push(`<meta name="theme-color" content="${ogData.theme}" />`)

  // OpenGraph
  meta.push(`<meta property="og:site_name" content="${ogData.site}" />`)
  meta.push('<meta property="og:type" content="website" />')
  meta.push(`<meta property="og:url" content="${ogData.url}" />`)
  if (ogData.title) meta.push(`<meta property="og:title" content="${ogData.title}" />`)
  if (ogData.description) meta.push(`<meta property="og:description" content="${ogData.description}" />`)
  if (ogData.isImage) meta.push(`<meta property="og:image" content="${ogData.path}" />`)
  if (ogData.isAudio) {
    meta.push(`<meta property="og:audio" content="${ogData.path}" />`)
    meta.push(`<meta property="og:audio:type" content="${ogData.mimetype}" />`)
  }
  if (ogData.isVideo) {
    meta.push(`<meta property="og:video" content="${ogData.path}" />`)
    meta.push(`<meta property="og:video:type" content="${ogData.mimetype}" />`)
  }
  if (ogData.isAlbum || ogData.isVideo || ogData.isAudio || ogData.isText) meta.push(`<meta property="og:image" content="${ogData.url}/thumbnail" />`)
  if (ogData.isUser) meta.push(`<meta property="og:image" content="${ogData.avatar}" />`)

  // Twitter Card
  if (ogData.description) meta.push(`<meta property="twitter:description" content="${ogData.description}" />`)
  if (!ogData.isAlbum && !ogData.isUser && ogData.isImage) meta.push('<meta name="twitter:card" content="summary_large_image" />')
  if (ogData.isAlbum || ogData.isUser || ogData.isVideo || ogData.isAudio || ogData.isText) meta.push('<meta property="twitter:card" content="summary" />')

  return meta.join('\n')
})
