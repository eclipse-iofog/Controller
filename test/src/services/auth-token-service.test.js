'use strict'

const { expect } = require('chai')
const { decodeJwt } = require('jose')
const sinon = require('sinon')
const {
  snapshotOidcEnv,
  DEFAULT_TEST_PASSWORD,
  createEmbeddedAuthHarness,
  teardownEmbeddedAuth
} = require('../../support/embedded-auth-harness')
const AuthTokenService = require('../../../src/services/auth-token-service')

function expectJwtShape (token) {
  expect(token).to.be.a('string')
  expect(token.split('.')).to.have.length(3)
  expect(token.startsWith('eyJ')).to.equal(true)
}

describe('Auth token service', () => {
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

  it('issues JWT access and refresh tokens from login', async () => {
    const { store, modules } = await $harness
    await store.seedUser({
      email: 'viewer@example.com',
      groupNames: ['viewer']
    })

    const result = await modules.UserService.login({
      email: 'viewer@example.com',
      password: DEFAULT_TEST_PASSWORD
    }, false)

    expectJwtShape(result.accessToken)
    expectJwtShape(result.refreshToken)

    const accessClaims = decodeJwt(result.accessToken)
    const refreshClaims = decodeJwt(result.refreshToken)

    expect(accessClaims.token_use).to.equal(AuthTokenService.ACCESS_TOKEN_USE)
    expect(refreshClaims.token_use).to.equal(AuthTokenService.REFRESH_TOKEN_USE)
    expect(refreshClaims.jti).to.be.a('string').that.is.not.empty
    expect(refreshClaims.family_id).to.be.a('string').that.is.not.empty
  })

  it('rotates JWT refresh tokens', async () => {
    const { store, modules } = await $harness
    await store.seedUser({
      email: 'viewer@example.com',
      groupNames: ['viewer']
    })

    const loginResult = await modules.UserService.login({
      email: 'viewer@example.com',
      password: DEFAULT_TEST_PASSWORD
    }, false)

    const refreshResult = await modules.UserService.refresh({
      refreshToken: loginResult.refreshToken
    }, false)

    expectJwtShape(refreshResult.accessToken)
    expectJwtShape(refreshResult.refreshToken)
    expect(refreshResult.refreshToken).to.not.equal(loginResult.refreshToken)
  })
})
