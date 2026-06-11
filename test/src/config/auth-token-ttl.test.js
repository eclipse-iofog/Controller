'use strict'

const { expect } = require('chai')
const { DEFAULT_POLICY } = require('../../../src/config/auth-policy-defaults')

describe('auth-token-ttl', () => {
  afterEach(() => {
    delete process.env.AUTH_ACCESS_TOKEN_TTL_SECONDS
    delete process.env.AUTH_REFRESH_TOKEN_TTL_SECONDS
    delete require.cache[require.resolve('../../../src/config/auth-token-ttl')]
  })

  it('applies env overrides without mutating AuthPolicy defaults', () => {
    process.env.AUTH_ACCESS_TOKEN_TTL_SECONDS = '1200'
    process.env.AUTH_REFRESH_TOKEN_TTL_SECONDS = '7200'

    const { applyTokenTtlOverrides } = require('../../../src/config/auth-token-ttl')
    const result = applyTokenTtlOverrides({
      accessTokenTtlSeconds: 900,
      refreshTokenTtlSeconds: 3600
    })

    expect(result.accessTokenTtlSeconds).to.equal(1200)
    expect(result.refreshTokenTtlSeconds).to.equal(7200)
    expect(DEFAULT_POLICY.refreshTokenTtlSeconds).to.equal(3600)
  })

  it('falls back to policy values when overrides are unset', () => {
    const { applyTokenTtlOverrides } = require('../../../src/config/auth-token-ttl')
    const result = applyTokenTtlOverrides({
      accessTokenTtlSeconds: 900,
      refreshTokenTtlSeconds: 3600
    })

    expect(result.accessTokenTtlSeconds).to.equal(900)
    expect(result.refreshTokenTtlSeconds).to.equal(3600)
  })
})
