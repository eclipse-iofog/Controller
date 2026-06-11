const { createLocalJWKSet, jwtVerify } = require('jose')
const { getPublicJwk } = require('../../src/config/auth-jwks')

/**
 * Verify an embedded-mode access token against local JWKS material (no remote issuer).
 */
async function verifyEmbeddedAccessToken (accessToken, { issuer, audience, privateJwk }) {
  const jwks = createLocalJWKSet({ keys: [getPublicJwk(privateJwk)] })
  const verifyOptions = { issuer }
  if (audience) {
    verifyOptions.audience = audience
  }

  const { payload } = await jwtVerify(accessToken, jwks, verifyOptions)
  return { token: accessToken, payload }
}

function buildKauthGrant (payload, token) {
  return {
    grant: {
      access_token: {
        token,
        content: payload
      }
    }
  }
}

module.exports = {
  verifyEmbeddedAccessToken,
  buildKauthGrant
}
