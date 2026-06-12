const { expect } = require('chai')
const sinon = require('sinon')

const {
  snapshotOidcEnv,
  DEFAULT_TEST_PASSWORD,
  EMBEDDED_PUBLIC_URL,
  EMBEDDED_CLIENT_ID,
  createEmbeddedAuthHarness,
  teardownEmbeddedAuth
} = require('../../support/embedded-auth-harness')
const { verifyEmbeddedAccessToken } = require('../../support/embedded-auth-smoke')

describe('Embedded auth smoke', () => {
  def('sandbox', () => sinon.createSandbox())
  def('envSnapshot', () => snapshotOidcEnv())
  def('harness', async () => createEmbeddedAuthHarness($sandbox))

  beforeEach(async () => {
    await $harness
  })

  afterEach(() => {
    $sandbox.restore()
    teardownEmbeddedAuth($envSnapshot)
  })

  it('issues RS256 access tokens validated by embedded JWKS', async () => {
    const { store, modules, signing } = await $harness
    await store.seedUser({
      email: 'smoke-user@example.com',
      groupNames: ['sre']
    })

    const loginResult = await modules.UserService.login({
      email: 'smoke-user@example.com',
      password: DEFAULT_TEST_PASSWORD
    }, false)

    const { token, payload } = await verifyEmbeddedAccessToken(loginResult.accessToken, {
      issuer: `${EMBEDDED_PUBLIC_URL}/oidc`,
      audience: EMBEDDED_CLIENT_ID,
      privateJwk: signing.privateJwk
    })

    expect(token.split('.')).to.have.length(3)
    expect(payload.preferred_username).to.equal('smoke-user@example.com')
    expect(payload.groups).to.deep.equal(['sre'])
    expect(payload.iss).to.equal(`${EMBEDDED_PUBLIC_URL}/oidc`)
    expect(payload.aud).to.equal(EMBEDDED_CLIENT_ID)
  })
})
