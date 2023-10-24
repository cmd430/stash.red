import { extname } from 'node:path'
import handlebars from 'handlebars'

// TODO: get this working
//handlebars.registerHelper('paginate', handlebarsPaginate)
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
handlebars.registerHelper('split', (data, split, index) => data.split(split)[index])
handlebars.registerHelper('ext', data => extname(data).slice(1))
handlebars.registerHelper('json', data => JSON.stringify(data, null, 2))
handlebars.registerHelper('opengraph', data => {
  const meta = []

  // Google
  meta.push(`<meta name="theme-color" content="${data.theme}" />`)

  // OpenGraph
  meta.push(`<meta property="og:site_name" content="${data.site}" />`)
  meta.push('<meta property="og:type" content="website" />')
  meta.push(`<meta property="og:url" content="${data.url}" />`)
  if (data.title) meta.push(`<meta property="og:title" content="${data.title}" />`)
  if (data.description) meta.push(`<meta property="og:description" content="${data.description}" />`)
  if (data.image) meta.push(`<meta property="og:image" content="${data.image}" />`)
  if (data.isAlbum === true || data.video || data.audio || data.text) meta.push(`<meta property="og:image" content="${data.url}/thumbnail" />`)
  if (data.isUser === true) meta.push(`<meta property="og:image" content="${data.avatar}" />`)

  // Twitter Card
  if (data.description) meta.push(`<meta property="twitter:description" content="${data.description}" />`)
  if (data.isAlbum === true && data.isUser !== true && data.image) meta.push('<meta name="twitter:card" content="summary_large_image" />')
  if (data.isAlbum === true || data.isUser === true || data.video || data.audio || data.text) meta.push('<meta property="twitter:card" content="summary" />')

  return meta.join('\n')
})
