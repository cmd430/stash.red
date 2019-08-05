import { join } from 'path'
import hbs from 'hbs'
import hbsPaginate from 'handlebars-paginate'

function renderer (app) {
  // setup handlebars (for view engine)
  //hbs.localsAsTemplateData(app)
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
  hbs.registerHelper('ext', data => data.split('/')[1])
  hbs.registerHelper('json', data => JSON.stringify(data, null, 2))
  return hbs
}

export default renderer