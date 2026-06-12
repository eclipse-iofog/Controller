'use strict'

const { expect } = require('chai')
const {
  snapshotOidcEnv,
  teardownEmbeddedAuth
} = require('../../support/embedded-auth-harness')

describe('Auth OIDC TTL resolution', () => {
  def('envSnapshot', () => snapshotOidcEnv())

  afterEach(() => {
    delete process.env.AUTH_SESSION_STORE_TTL_MS
    delete process.env.AUTH_OIDC_INTERACTION_TTL_SECONDS
    delete process.env.AUTH_OIDC_GRANT_TTL_SECONDS
    delete process.env.AUTH_OIDC_SESSION_TTL_SECONDS
    teardownEmbeddedAuth($envSnapshot)
    delete require.cache[require.resolve('../../../src/config/auth-oidc-ttl')]
    delete require.cache[require.resolve('../../../src/config/auth-session-store')]
  })

  it('derives interaction and grant TTL from the BFF session store default', () => {
    const { resolveOidcProviderTtls } = require('../../../src/config/auth-oidc-ttl')
    const ttls = resolveOidcProviderTtls({
      accessTokenTtlSeconds: 1200,
      refreshTokenTtlSeconds: 86400
    })

    expect(ttls).to.deep.equal({
      accessTokenTtlSeconds: 1200,
      refreshTokenTtlSeconds: 86400,
      idTokenTtlSeconds: 1200,
      interactionTtlSeconds: 600,
      grantTtlSeconds: 600,
      sessionTtlSeconds: 86400
    })
  })

  it('uses AuthPolicy refresh token TTL for provider session when not overridden', () => {
    const { resolveOidcProviderTtls } = require('../../../src/config/auth-oidc-ttl')
    const ttls = resolveOidcProviderTtls({
      refreshTokenTtlSeconds: 1209600
    })

    expect(ttls.sessionTtlSeconds).to.equal(1209600)
  })

  it('defaults id token TTL to AuthPolicy access token TTL', () => {
    const { resolveOidcProviderTtls } = require('../../../src/config/auth-oidc-ttl')
    const ttls = resolveOidcProviderTtls({
      accessTokenTtlSeconds: 300,
      refreshTokenTtlSeconds: 604800
    })

    expect(ttls.idTokenTtlSeconds).to.equal(300)
  })

  it('honors explicit OIDC TTL env overrides', () => {
    process.env.AUTH_SESSION_STORE_TTL_MS = '300000'
    process.env.AUTH_OIDC_INTERACTION_TTL_SECONDS = '900'
    process.env.AUTH_OIDC_GRANT_TTL_SECONDS = '1200'
    process.env.AUTH_OIDC_SESSION_TTL_SECONDS = '3600'

    const { resolveOidcProviderTtls } = require('../../../src/config/auth-oidc-ttl')
    const ttls = resolveOidcProviderTtls()

    expect(ttls.interactionTtlSeconds).to.equal(900)
    expect(ttls.grantTtlSeconds).to.equal(1200)
    expect(ttls.sessionTtlSeconds).to.equal(3600)
  })

  it('loads TTLs from AuthPolicy via the database', async () => {
    const db = {
      AuthPolicy: {
        findByPk: async () => ({
          get: () => ({
            accessTokenTtlSeconds: 1800,
            refreshTokenTtlSeconds: 259200
          })
        })
      }
    }

    const { loadOidcProviderTtls } = require('../../../src/config/auth-oidc-ttl')
    const ttls = await loadOidcProviderTtls(db)

    expect(ttls.accessTokenTtlSeconds).to.equal(1800)
    expect(ttls.refreshTokenTtlSeconds).to.equal(259200)
    expect(ttls.sessionTtlSeconds).to.equal(259200)
    expect(ttls.interactionTtlSeconds).to.equal(600)
  })
})
