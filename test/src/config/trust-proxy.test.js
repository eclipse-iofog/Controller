'use strict'

const { expect } = require('chai')
const config = require('../../../src/config')

describe('config.getBoolean', () => {
  let originalGet

  beforeEach(() => {
    originalGet = config.get.bind(config)
    delete require.cache[require.resolve('../../../src/config/trust-proxy')]
  })

  afterEach(() => {
    config.get = originalGet
    delete require.cache[require.resolve('../../../src/config/trust-proxy')]
  })

  it('returns true for string "true" config values', () => {
    config.get = (key, defaultValue) => {
      if (key === 'server.trustProxy') return 'true'
      return originalGet(key, defaultValue)
    }
    expect(config.getBoolean('server.trustProxy', false)).to.equal(true)
  })

  it('returns false for string "false" config values', () => {
    config.get = (key, defaultValue) => {
      if (key === 'server.trustProxy') return 'false'
      return originalGet(key, defaultValue)
    }
    expect(config.getBoolean('server.trustProxy', true)).to.equal(false)
  })

  it('returns true for string "1" config values', () => {
    config.get = (key, defaultValue) => {
      if (key === 'server.devMode') return '1'
      return originalGet(key, defaultValue)
    }
    expect(config.getBoolean('server.devMode', false)).to.equal(true)
  })
})

describe('trust-proxy', () => {
  let originalGet

  beforeEach(() => {
    originalGet = config.get.bind(config)
    delete require.cache[require.resolve('../../../src/config/trust-proxy')]
  })

  afterEach(() => {
    config.get = originalGet
    delete require.cache[require.resolve('../../../src/config/trust-proxy')]
  })

  it('returns true when trust proxy config is the string "true"', () => {
    config.get = (key, defaultValue) => {
      if (key === 'server.trustProxy') return 'true'
      return originalGet(key, defaultValue)
    }
    const { getTrustProxySetting } = require('../../../src/config/trust-proxy')
    expect(getTrustProxySetting()).to.equal(true)
  })

  it('returns false when trust proxy config is the string "false"', () => {
    config.get = (key, defaultValue) => {
      if (key === 'server.trustProxy') return 'false'
      return originalGet(key, defaultValue)
    }
    const { getTrustProxySetting } = require('../../../src/config/trust-proxy')
    expect(getTrustProxySetting()).to.equal(false)
  })

  it('passes through hop count from config', () => {
    config.get = (key, defaultValue) => {
      if (key === 'server.trustProxy') return 2
      return originalGet(key, defaultValue)
    }
    const { getTrustProxySetting } = require('../../../src/config/trust-proxy')
    expect(getTrustProxySetting()).to.equal(2)
  })
})
