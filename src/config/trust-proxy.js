'use strict'

const config = require('./index')
const { parseBoolean } = require('./parse-boolean')

function getTrustProxySetting () {
  const trustProxy = config.get('server.trustProxy', false)
  const parsed = parseBoolean(trustProxy)
  if (parsed !== undefined) {
    return parsed
  }
  return trustProxy || false
}

module.exports = {
  getTrustProxySetting
}
