'use strict'

const sinon = require('sinon')
const { expect } = require('chai')
const config = require('../../../src/config')
const {
  snapshotOidcEnv,
  restoreOidcEnv
} = require('../../support/oidc-test-helpers')

describe('auth-urls', () => {
  def('envSnapshot', () => snapshotOidcEnv())

  afterEach(() => {
    restoreOidcEnv($envSnapshot)
    delete process.env.CONSOLE_URL
    delete process.env.CONTROLLER_PUBLIC_URL
    delete require.cache[require.resolve('../../../src/config/auth-urls')]
    sinon.restore()
  })

  it('uses CONTROLLER_PUBLIC_URL when CONSOLE_URL is unset', () => {
    process.env.CONTROLLER_PUBLIC_URL = 'https://controller.example.com/'
    delete process.env.CONSOLE_URL
    sinon.stub(config, 'get').callsFake((key) => {
      if (key === 'console.url') return ''
      return ''
    })

    const { getPublicUrl, getConsoleUrl } = require('../../../src/config/auth-urls')
    expect(getPublicUrl()).to.equal('https://controller.example.com')
    expect(getConsoleUrl()).to.equal('https://controller.example.com')
  })

  it('prefers explicit CONSOLE_URL over CONTROLLER_PUBLIC_URL', () => {
    process.env.CONTROLLER_PUBLIC_URL = 'https://controller.example.com'
    process.env.CONSOLE_URL = 'https://console.example.com/'

    const { getConsoleUrl } = require('../../../src/config/auth-urls')
    expect(getConsoleUrl()).to.equal('https://console.example.com')
  })
})
