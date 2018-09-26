const nconf = require('nconf')
const path = require('path')

function Config() {
  if (process.env.NODE_ENV == null) {
    throw new Error('process.env.NODE_ENV not set.')
  }

  nconf.env({ separator: '_', })
  const environment = nconf.get('NODE:ENV') || 'production'
  nconf.file(environment, path.join(__dirname, process.env.NODE_ENV.toLowerCase() + '.json'))
  nconf.file('default', path.join(__dirname, 'default.json'))
}

Config.prototype.get = (key) => {
  return nconf.get(key)
}

Config.prototype.set = (key, value) => {
  const environment = nconf.get('NODE:ENV') || 'production'

  nconf.set(key, value)
  nconf.save(environment)
}

module.exports = new Config()