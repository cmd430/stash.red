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

    meta.push(`<meta name="theme-color" content="${data.theme}" />`)
    meta.push(`<meta property="og:site_name" content="${data.site}" />`)
    if (data.title !== undefined) meta.push(`<meta property="og:title" content="${data.title}" />`)
    if (data.image !== undefined) meta.push(`<meta property="og:image" content="${data.image}" />`)
    if (data.video !== undefined) meta.push(`<meta property="og:video" content="${data.video}" />`)
    if (data.audio !== undefined) meta.push(`<meta property="og:audio" content="${data.audio}" />`)

    return meta.join('\n')
  })
  return hbs
}

export default renderer
