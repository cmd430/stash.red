import { hash as bcrypt_hash, compare } from 'bcrypt'
import nanoid from 'nanoid'
//import { randomBytes } from 'crypto'

function mergeDeep (...objects) {
  const isObject = obj => obj && typeof obj === 'object'
  return objects.reduce((prev, obj) => {
    Object.keys(obj).forEach(key => {
      const pVal = prev[key]
      const oVal = obj[key]
      if (Array.isArray(pVal) && Array.isArray(oVal)) {
        prev[key] = [...pVal, ...oVal].filter((element, index, array) => array.indexOf(element) === index)
      }
      else if (isObject(pVal) && isObject(oVal)) {
        prev[key] = mergeDeep(pVal, oVal)
      }
      else {
        prev[key] = oVal
      }
    })
    return prev
  }, {})
}

function hash (password) {
  return bcrypt_hash(password, config.auth.rounds)
}
function clearDeadCookies (cookieName) {
  return (req, res, next) => {
    if (req.cookies[cookieName] && !req.session.user) res.clearCookie(cookieName)
    next()
  }
}
function createID () {
  return nanoid(8)
  //return randomBytes(6).toString('hex')
}

export { mergeDeep as merge, hash, compare as validate, createID, clearDeadCookies }
