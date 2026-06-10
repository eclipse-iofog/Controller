const { expect } = require('chai')

const { MockOidcProvider } = require('../../support/mock-oidc-provider')
const {
  enableMockOidcTls,
  restoreMockOidcTls
} = require('../../support/oidc-test-helpers')
const { verifyMockAccessToken } = require('../../support/oidc-smoke')

describe('Mock OIDC provider smoke', () => {
  def('provider', () => new MockOidcProvider())

  beforeEach(async () => {
    enableMockOidcTls()
    await $provider.start()
  })

  afterEach(async () => {
    restoreMockOidcTls()
    await $provider.stop()
  })

  it('serves discovery metadata and validates RS256 access tokens', async () => {
    const { token, payload } = await verifyMockAccessToken($provider, {
      preferred_username: 'smoke-user',
      roles: ['SRE']
    })

    expect(token.split('.')).to.have.length(3)
    expect(payload.preferred_username).to.equal('smoke-user')
    expect(payload.roles).to.deep.equal(['SRE'])
    expect(payload.iss).to.equal($provider.issuer)
    expect(payload.aud).to.equal($provider.clientId)
  })
})
