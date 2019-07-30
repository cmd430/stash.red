function mergeDeep(...objects) {
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

module.exports = {
  merge: mergeDeep
}