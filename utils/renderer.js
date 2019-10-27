import { join, extname } from 'path'
import hbs from 'hbs'
import hbsPaginate from 'handlebars-paginate'

function renderer (app) {
  // setup handlebars (for view engine)
  hbs.localsAsTemplateData(app)
  hbs.registerPartials(join(app.get('views'), 'partials'))
  hbs.registerHelper('paginate', hbsPaginate)
  hbs.registerHelper('if_eq', (a, b, context, opts) => {
    if (context instanceof Function) opts = context
    if (!context instanceof Object) context = this
    if (a === b) return opts.fn(context)
    return opts.inverse(context)
  })
  hbs.registerHelper('if_contains', (a, b, context, opts) => {
    if (context instanceof Function) opts = context
    if (!context instanceof Object) context = this
    if (a.includes(b)) return opts.fn(context)
    return opts.inverse(context)
  })
  hbs.registerHelper('split', (data, split, index) => data.split(split)[index])
  hbs.registerHelper('ext', data => extname(data).substr(1))
  hbs.registerHelper('json', data => JSON.stringify(data, null, 2))
  hbs.registerHelper('opengraph', data => {
    let meta = []

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
  return hbs
}

export default renderer
