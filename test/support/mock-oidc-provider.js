const https = require('https')
const { URL } = require('url')
const forge = require('node-forge')
const { generateKeyPair, exportJWK, SignJWT, calculateJwkThumbprint, decodeJwt } = require('jose')

function createSelfSignedTlsCredentials () {
  const keys = forge.pki.rsa.generateKeyPair(2048)
  const certificate = forge.pki.createCertificate()

  certificate.publicKey = keys.publicKey
  certificate.serialNumber = '01'
  certificate.validity.notBefore = new Date()
  certificate.validity.notAfter = new Date()
  certificate.validity.notAfter.setFullYear(certificate.validity.notBefore.getFullYear() + 1)

  const attributes = [{ name: 'commonName', value: 'mock-oidc' }]
  certificate.setSubject(attributes)
  certificate.setIssuer(attributes)
  certificate.setExtensions([{
    name: 'subjectAltName',
    altNames: [{ type: 7, ip: '127.0.0.1' }]
  }])
  certificate.sign(keys.privateKey, forge.md.sha256.create())

  return {
    key: forge.pki.privateKeyToPem(keys.privateKey),
    cert: forge.pki.certificateToPem(certificate)
  }
}

/**
 * Minimal OIDC issuer for unit tests and local dev smoke runs.
 * Serves discovery, JWKS, token, userinfo, and revocation over HTTPS.
 */
class MockOidcProvider {
  constructor (options = {}) {
    this.clientId = options.clientId || 'controller-test-client'
    this.clientSecret = options.clientSecret || 'test-client-secret'
    this.username = options.username || 'test-user'
    this.password = options.password || 'test-password'
    this.port = options.port || 0
    this.server = null
    this.baseUrl = null
    this.issuer = null
    this.privateKey = null
    this.publicJwk = null
    this.kid = null
    this.tls = createSelfSignedTlsCredentials()
    this.refreshTokens = new Map()
  }

  async start () {
    const { publicKey, privateKey } = await generateKeyPair('RS256')
    this.privateKey = privateKey
    this.publicJwk = await exportJWK(publicKey)
    this.kid = await calculateJwkThumbprint(this.publicJwk)
    this.publicJwk.kid = this.kid
    this.publicJwk.alg = 'RS256'
    this.publicJwk.use = 'sig'

    return new Promise((resolve, reject) => {
      this.server = https.createServer(this.tls, (req, res) => {
        this.handleRequest(req, res).catch((error) => {
          res.statusCode = 500
          res.end(error.message)
        })
      })
      this.server.on('error', reject)
      this.server.listen(this.port, '127.0.0.1', () => {
        const address = this.server.address()
        this.baseUrl = `https://127.0.0.1:${address.port}`
        this.issuer = this.baseUrl
        resolve(this)
      })
    })
  }

  async readBody (req) {
    const chunks = []
    for await (const chunk of req) {
      chunks.push(chunk)
    }
    return Buffer.concat(chunks).toString('utf8')
  }

  async handleRequest (req, res) {
    const url = new URL(req.url, this.baseUrl)
    const pathname = url.pathname

    if (pathname === '/.well-known/openid-configuration') {
      return this.sendJson(res, {
        issuer: this.issuer,
        jwks_uri: `${this.baseUrl}/jwks`,
        token_endpoint: `${this.baseUrl}/token`,
        userinfo_endpoint: `${this.baseUrl}/userinfo`,
        revocation_endpoint: `${this.baseUrl}/revoke`,
        authorization_endpoint: `${this.baseUrl}/authorize`,
        response_types_supported: ['code'],
        subject_types_supported: ['public'],
        id_token_signing_alg_values_supported: ['RS256']
      })
    }

    if (pathname === '/jwks') {
      return this.sendJson(res, { keys: [this.publicJwk] })
    }

    if (pathname === '/token' && req.method === 'POST') {
      return this.handleTokenRequest(req, res)
    }

    if (pathname === '/userinfo' && req.method === 'GET') {
      return this.handleUserInfoRequest(req, res)
    }

    if (pathname === '/revoke' && req.method === 'POST') {
      res.statusCode = 200
      return res.end()
    }

    res.statusCode = 404
    res.end('Not found')
  }

  validateClient (params) {
    return params.get('client_id') === this.clientId
      && params.get('client_secret') === this.clientSecret
  }

  async handleTokenRequest (req, res) {
    const body = await this.readBody(req)
    const params = new URLSearchParams(body)

    if (!this.validateClient(params)) {
      return this.sendOAuthError(res, 401, 'invalid_client', 'Invalid client credentials')
    }

    const grantType = params.get('grant_type')

    if (grantType === 'password') {
      const username = params.get('username')
      const password = params.get('password')
      if (username !== this.username || password !== this.password) {
        return this.sendOAuthError(res, 401, 'invalid_grant', 'Invalid user credentials')
      }

      return this.sendTokenResponse(res, await this.buildUserClaims(username))
    }

    if (grantType === 'refresh_token') {
      const refreshToken = params.get('refresh_token')
      const claims = this.refreshTokens.get(refreshToken)
      if (!claims) {
        return this.sendOAuthError(res, 401, 'invalid_grant', 'Invalid refresh token')
      }

      return this.sendTokenResponse(res, claims)
    }

    return this.sendOAuthError(res, 400, 'unsupported_grant_type', 'Unsupported grant type')
  }

  async handleUserInfoRequest (req, res) {
    const authHeader = req.headers.authorization || ''
    if (!authHeader.startsWith('Bearer ')) {
      return this.sendOAuthError(res, 401, 'invalid_token', 'Missing bearer token')
    }

    try {
      const accessToken = authHeader.slice('Bearer '.length).trim()
      const claims = decodeJwt(accessToken)
      return this.sendJson(res, {
        sub: claims.sub,
        preferred_username: claims.preferred_username,
        email: claims.email,
        roles: claims.roles
      })
    } catch (error) {
      return this.sendOAuthError(res, 401, 'invalid_token', 'Invalid bearer token')
    }
  }

  async buildUserClaims (username) {
    return {
      sub: 'test-user-id',
      preferred_username: username,
      email: `${username}@example.com`,
      roles: ['SRE', 'Viewer']
    }
  }

  async sendTokenResponse (res, claims) {
    const accessToken = await this.issueAccessToken(claims)
    const refreshToken = `mock-refresh-${claims.sub}-${Date.now()}`
    this.refreshTokens.set(refreshToken, claims)

    return this.sendJson(res, {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'Bearer',
      expires_in: 3600
    })
  }

  sendOAuthError (res, statusCode, error, errorDescription) {
    res.statusCode = statusCode
    return this.sendJson(res, {
      error,
      error_description: errorDescription
    })
  }

  sendJson (res, body) {
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(body))
  }

  async issueAccessToken (claims = {}) {
    const now = Math.floor(Date.now() / 1000)
    const payload = {
      sub: 'test-user-id',
      preferred_username: 'test-user',
      iss: this.issuer,
      aud: this.clientId,
      exp: now + 3600,
      iat: now,
      ...claims
    }

    return new SignJWT(payload)
      .setProtectedHeader({ alg: 'RS256', kid: this.kid })
      .sign(this.privateKey)
  }

  getEnv () {
    return {
      OIDC_ISSUER_URL: this.issuer,
      OIDC_CLIENT_ID: this.clientId,
      OIDC_CLIENT_SECRET: this.clientSecret
    }
  }

  async stop () {
    if (!this.server) {
      return
    }

    if (typeof this.server.closeAllConnections === 'function') {
      this.server.closeAllConnections()
    }

    await new Promise((resolve, reject) => {
      this.server.close((error) => (error ? reject(error) : resolve()))
    })
    this.server = null
    this.refreshTokens.clear()
  }
}

module.exports = {
  MockOidcProvider
}
