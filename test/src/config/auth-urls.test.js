'use strict'

const { expect } = require('chai')
const {
  snapshotOidcEnv,
  restoreOidcEnv,
  applyOidcEnv
} = require('../../support/oidc-test-helpers')

describe('auth-urls', () => {
  def('envSnapshot', () => snapshotOidcEnv())

  afterEach(() => {
    restoreOidcEnv($envSnapshot)
    delete process.env.VIEWER_URL
    delete process.env.CONTROLLER_PUBLIC_URL
    delete require.cache[require.resolve('../../../src/config/auth-urls')]
  })

  it('uses CONTROLLER_PUBLIC_URL when VIEWER_URL is unset', () => {
    process.env.CONTROLLER_PUBLIC_URL = 'https://controller.example.com/'
    delete process.env.VIEWER_URL

    const { getPublicUrl, getViewerUrl } = require('../../../src/config/auth-urls')
    expect(getPublicUrl()).to.equal('https://controller.example.com')
    expect(getViewerUrl()).to.equal('https://controller.example.com')
  })

  it('prefers explicit VIEWER_URL over CONTROLLER_PUBLIC_URL', () => {
    process.env.CONTROLLER_PUBLIC_URL = 'https://controller.example.com'
    process.env.VIEWER_URL = 'https://viewer.example.com/'

    const { getViewerUrl } = require('../../../src/config/auth-urls')
    expect(getViewerUrl()).to.equal('https://viewer.example.com')
  })
})
