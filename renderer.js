const path = require('path')
const hbs = require('hbs')
const hbsPaginate = require('handlebars-paginate')

module.exports = app => {
  // setup handlebars (for view engine)
  hbs.localsAsTemplateData(app)
  hbs.registerPartials(path.join(app.get('views'), 'partials'))
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
  hbs.registerHelper('typeof', file => {
    let type = file.meta.type
    return `${type.charAt(0).toUpperCase()}${type.slice(1)}`
  })
  hbs.registerHelper('json', data => {
    return JSON.stringify(data)
  })
  return hbs
}