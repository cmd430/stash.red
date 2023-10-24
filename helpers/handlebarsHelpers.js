import { extname } from 'node:path'
import handlebars from 'handlebars'

//handlebars.registerHelper('paginate', handlebarsPaginate)
handlebars.registerHelper('if_eq', (a, b, context, opts) => {
  if (context instanceof Function) opts = context
  if (!(context instanceof Object)) context = this
  if (a === b) return opts.fn(context)
  return opts.inverse(context)
})
handlebars.registerHelper('if_eq_or', (a, b, c, context, opts) => {
  if (context instanceof Function) opts = context
  if (!(context instanceof Object)) context = this
  if (a === b || c === true) return opts.fn(context)
  return opts.inverse(context)
})
handlebars.registerHelper('if_contains', (a, b, context, opts) => {
  if (context instanceof Function) opts = context
  if (!(context instanceof Object)) context = this
  if (a.includes(b)) return opts.fn(context)
  return opts.inverse(context)
})
handlebars.registerHelper('split', (data, split, index) => data.split(split)[index])
handlebars.registerHelper('ext', data => extname(data).slice(1))
handlebars.registerHelper('json', data => JSON.stringify(data, null, 2))
handlebars.registerHelper('opengraph', data => {

  console.debug(data)

  data = {
    theme: 'theme',
    site: 'site',
    url: 'url',
    title: 'title',
    description: 'description',
    image: 'image',
    avatar: 'avatar'
  }

  const meta = []

  // Google
  meta.push(`<meta name="theme-color" content="${data.theme}" />`)

  // OpenGraph
  meta.push(`<meta property="og:site_name" content="${data.site}" />`)
  meta.push('<meta property="og:type" content="website" />')
  meta.push(`<meta property="og:url" content="${data.url}" />`)
  if (data.title !== undefined) meta.push(`<meta property="og:title" content="${data.title}" />`)
  if (data.description !== undefined) meta.push(`<meta property="og:description" content="${data.description}" />`)
  if (data.image !== undefined) meta.push(`<meta property="og:image" content="${data.image}" />`)
  if (data.album !== undefined || data.video !== undefined || data.audio !== undefined || data.text) meta.push(`<meta property="og:image" content="${data.url}/thumbnail" />`)
  if (data.user !== undefined) meta.push(`<meta property="og:image" content="${data.avatar}" />`)

  // Twitter Card
  if (data.description !== undefined) meta.push(`<meta property="twitter:description" content="${data.description}" />`)
  if (data.album === undefined && data.user === undefined && data.image !== undefined) meta.push('<meta name="twitter:card" content="summary_large_image" />')
  if (data.album !== undefined || data.video !== undefined || data.audio !== undefined || data.text !== undefined || data.user !== undefined) meta.push('<meta property="twitter:card" content="summary" />')

  return meta.join('\n')
})
