import databaseConnection from '../database/databaseConnection.js'

export const config = databaseConnection.prepare('SELECT * FROM "config"')
  .all()
  .reduce((obj, item) => {
    obj[item.key] = item.value
    try {
      obj[item.key] = JSON.parse(item.value)
    } catch (e) {}
    return obj
  }, {})
