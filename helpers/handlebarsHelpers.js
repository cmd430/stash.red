import { extname } from 'node:path'
import handlebars from 'handlebars'
import handlebarsPaginate from 'handlebars-paginate'

handlebars.registerHelper('paginate', handlebarsPaginate)
handlebars.registerHelper('if_eq', (a, b, context, opts) => {
  if (context instanceof Function) opts = context
  // eslint-disable-next-line consistent-this, no-invalid-this
  if (!(context instanceof Object)) context = this
  if (a === b) return opts.fn(context)
  return opts.inverse(context)
})
handlebars.registerHelper('if_eq_or', (a, b, c, context, opts) => {
  if (context instanceof Function) opts = context
  // eslint-disable-next-line consistent-this, no-invalid-this
  if (!(context instanceof Object)) context = this
  if (a === b || c === true) return opts.fn(context)
  return opts.inverse(context)
})
handlebars.registerHelper('if_contains', (a, b, context, opts) => {
  if (context instanceof Function) opts = context
  // eslint-disable-next-line consistent-this, no-invalid-this
  if (!(context instanceof Object)) context = this
  if (a.includes(b)) return opts.fn(context)
  return opts.inverse(context)
})
handlebars.registerHelper('repeat', (n, context) => {
  let accum = ''
  for (let i = 0; i < n; ++i) accum += context.fn(i)
  return accum
})
handlebars.registerHelper('split', (data, split, index) => data.split(split)[index])
handlebars.registerHelper('ext', data => extname(data).slice(1))
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
