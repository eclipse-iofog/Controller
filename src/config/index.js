const nconf = require('nconf')
const path = require('path')

class Config {
  constructor() {
    nconf.env({ separator: '_', })
    const environment = nconf.get('NODE:ENV') || 'production'
    this.load(environment)
  }

  get(key) {
    return nconf.get(key)
  }

  set(key, value) {
    const environment = nconf.get('NODE:ENV') || 'production'

    nconf.stores[environment].set(key, value)
    nconf.stores[environment].saveSync()
  }

  load(environment) {
    nconf.file(environment, path.join(__dirname, environment.toLowerCase() + '.json'))
    nconf.file('default', path.join(__dirname, 'default.json'))
  }
}

module.exports = new Config()