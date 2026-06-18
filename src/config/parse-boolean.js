'use strict'

function parseBoolean (value, defaultValue) {
  if (value === true || value === 'true' || value === 1 || value === '1') {
    return true
  }
  if (value === false || value === 'false' || value === 0 || value === '0') {
    return false
  }
  if (value === undefined || value === null || value === '') {
    return arguments.length >= 2 ? defaultValue : undefined
  }
  return arguments.length >= 2 ? defaultValue : undefined
}

module.exports = {
  parseBoolean
}
