import { join } from 'path'
import hbs from 'hbs'
import hbsPaginate from 'handlebars-paginate'

function renderer (app) {
  // setup handlebars (for view engine)
  hbs.localsAsTemplateData(app)
  hbs.registerPartials(join(app.get('views'), 'partials'))
  hbs.registerHelper('paginate', hbsPaginate)
  hbs.registerHelper('if_eq', (a, b, context, opts) => {
    if (context instanceof Function) {
      opts = context
    }
    if (!context instanceof Object) {
      context = this
    }
    if (a === b) {
      return opts.fn(context)
    } else {
      return opts.inverse(context)
    }
  })
  hbs.registerHelper('json', data => {
    return JSON.stringify(data)
  })
  return hbs
}

export default renderer