const { createRemoteJWKSet, jwtVerify } = require('jose')
const oidcClient = require('openid-client')

/**
 * Generic OIDC smoke helper: discovery + JWKS fetch + JWT verify against MockOidcProvider.
 */
async function verifyMockAccessToken (provider, claims = {}) {
  const issuer = new URL(provider.issuer)
  const configuration = await oidcClient.discovery(
    issuer,
    provider.clientId,
    provider.clientSecret
  )
  const metadata = configuration.serverMetadata()
  const jwks = createRemoteJWKSet(new URL(metadata.jwks_uri))
  const token = await provider.issueAccessToken(claims)
  const verifyOptions = { issuer: metadata.issuer }
  if (provider.clientId) {
    verifyOptions.audience = provider.clientId
  }

  const { payload } = await jwtVerify(token, jwks, verifyOptions)
  return { token, payload }
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
  verifyMockAccessToken,
  buildKauthGrant
}
