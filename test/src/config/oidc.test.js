const { expect } = require('chai')
const sinon = require('sinon')
const express = require('express')

const config = require('../../../src/config')
const {
  snapshotOidcEnv,
  applyEmbeddedEnv,
  applyExternalEnv,
  createEmbeddedAuthHarness,
  teardownEmbeddedAuth
} = require('../../support/embedded-auth-harness')
const {
  applyOidcEnv,
  reloadOidcModule,
  runMiddleware
} = require('../../support/oidc-test-helpers')

describe('OIDC config', () => {
  def('sandbox', () => sinon.createSandbox())
  def('envSnapshot', () => snapshotOidcEnv())
  def('harness', async () => createEmbeddedAuthHarness($sandbox))

  afterEach(() => {
    $sandbox.restore()
    teardownEmbeddedAuth($envSnapshot)
  })

  describe('getAuthMode()', () => {
    it('defaults to embedded when AUTH_MODE is unset', () => {
      applyOidcEnv({})
      const oidc = reloadOidcModule()
      expect(oidc.getAuthMode()).to.equal('embedded')
    })

    it('throws for an invalid AUTH_MODE value', () => {
      applyOidcEnv({ AUTH_MODE: 'keycloak' })
      const oidc = reloadOidcModule()
      expect(() => oidc.getAuthMode()).to.throw('Invalid auth.mode')
    })
  })

  describe('isAuthConfigured()', () => {
    it('returns false when embedded mode has no public URL', () => {
      applyOidcEnv({}, { sandbox: $sandbox })
      const oidc = reloadOidcModule()
      expect(oidc.isAuthConfigured()).to.equal(false)
    })

    it('returns true in embedded mode when CONTROLLER_PUBLIC_URL is set', () => {
      applyEmbeddedEnv()
      const oidc = reloadOidcModule()
      expect(oidc.isAuthConfigured()).to.equal(true)
    })

    it('returns true in external mode when issuer, client id, and secret are set', () => {
      applyExternalEnv()
      const oidc = reloadOidcModule()
      expect(oidc.isAuthConfigured()).to.equal(true)
    })
  })

  describe('initOidc() without auth config', () => {
    it('initializes without bearer validation when auth is not configured in dev mode', async () => {
      applyOidcEnv({}, { sandbox: $sandbox })
      const oidc = reloadOidcModule()
      oidc.initOidc()

      const result = await runMiddleware(oidc.getOidcMiddleware(), {
        headers: {
          authorization: 'Bearer some-token'
        }
      })

      expect(result.nextCalled).to.equal(true)
      expect(result.req.kauth).to.equal(undefined)
    })
  })

  describe('initOidc() production mode', () => {
    it('throws when auth is not configured', () => {
      applyOidcEnv({}, {
        sandbox: $sandbox,
        configExtras: {
          getBoolean: { 'server.devMode': false }
        }
      })
      const oidc = reloadOidcModule()
      expect(() => oidc.initOidc()).to.throw('Auth configuration required in production mode')
    })
  })

  describe('getOidcMiddleware() with embedded issuer', () => {
    beforeEach(async () => {
      await $harness
    })

    it('populates req.kauth for a valid bearer token', async () => {
      const { store, modules } = await $harness
      await store.seedUser({
        email: 'alice@example.com',
        groupNames: ['sre']
      })

      const loginResult = await modules.UserService.login({
        email: 'alice@example.com',
        password: require('../../support/embedded-auth-harness').DEFAULT_TEST_PASSWORD
      }, false)

      modules.oidc.initOidc()
      const result = await runMiddleware(modules.oidc.getOidcMiddleware(), {
        headers: {
          authorization: `Bearer ${loginResult.accessToken}`
        }
      })

      expect(result.nextCalled).to.equal(true)
      expect(result.req.kauth.grant.access_token.token).to.equal(loginResult.accessToken)
      expect(result.req.kauth.grant.access_token.content.preferred_username).to.equal('alice@example.com')
      expect(result.req.kauth.grant.access_token.content.groups).to.deep.equal(['sre'])
    })

    it('leaves req.kauth unset for an invalid bearer token', async () => {
      const { modules } = await $harness
      modules.oidc.initOidc()

      const result = await runMiddleware(modules.oidc.getOidcMiddleware(), {
        headers: {
          authorization: 'Bearer not-a-valid-jwt'
        }
      })

      expect(result.nextCalled).to.equal(true)
      expect(result.req.kauth).to.equal(undefined)
    })

    it('passes through when Authorization header is missing', async () => {
      const { modules } = await $harness
      modules.oidc.initOidc()

      const result = await runMiddleware(modules.oidc.getOidcMiddleware(), {
        headers: {}
      })

      expect(result.nextCalled).to.equal(true)
      expect(result.req.kauth).to.equal(undefined)
    })

    it('skips OIDC validation for agent routes', async () => {
      const { modules } = await $harness
      modules.oidc.initOidc()

      const result = await runMiddleware(modules.oidc.getOidcMiddleware(), {
        path: '/api/v3/agent/status',
        headers: {
          authorization: 'Bearer not-an-oidc-token'
        }
      })

      expect(result.nextCalled).to.equal(true)
      expect(result.req.kauth).to.equal(undefined)
    })

    it('skips OIDC validation for public catalog routes such as /api/v3/status', async () => {
      const { modules } = await $harness
      modules.oidc.initOidc()

      const result = await runMiddleware(modules.oidc.getOidcMiddleware(), {
        method: 'GET',
        path: '/api/v3/status',
        headers: {
          authorization: 'Bearer not-an-oidc-token'
        }
      })

      expect(result.nextCalled).to.equal(true)
      expect(result.req.kauth).to.equal(undefined)
    })
  })

  describe('getOauthClientConfiguration()', () => {
    function createEmbeddedOidcStubDb () {
      const storedKeys = []
      const storedClients = []

      return {
        AuthOidcKey: {
          findAll: sinon.stub().resolves(storedKeys),
          create: sinon.stub().callsFake(async (values) => {
            storedKeys.push(values)
            return values
          })
        },
        AuthOidcClient: {
          findOne: sinon.stub().callsFake(async ({ where }) => {
            return storedClients.find((client) => client.clientId === where.clientId) || null
          }),
          create: sinon.stub().callsFake(async (values) => {
            storedClients.push(values)
            return values
          })
        },
        AuthOidcProviderState: {
          upsert: sinon.stub().resolves([{}, true]),
          findOne: sinon.stub().resolves(null),
          update: sinon.stub().resolves([1]),
          destroy: sinon.stub().resolves(0)
        },
        AuthPolicy: {
          findByPk: sinon.stub().resolves({
            accessTokenTtlSeconds: 900,
            refreshTokenTtlSeconds: 604800
          })
        },
        AuthUser: {
          findByPk: sinon.stub().resolves(null)
        }
      }
    }

    function reloadEmbeddedOidcModule () {
      const embeddedPath = require.resolve('../../../src/config/embedded-oidc')
      delete require.cache[embeddedPath]
      return require('../../../src/config/embedded-oidc')
    }

    async function withEmbeddedIssuerServer (run) {
      const app = express()

      const server = await new Promise((resolve, reject) => {
        const listener = app.listen(0, '127.0.0.1', () => resolve(listener))
        listener.on('error', reject)
      })

      const { port } = server.address()
      const issuerBase = `http://127.0.0.1:${port}`

      applyEmbeddedEnv({
        CONTROLLER_PUBLIC_URL: issuerBase,
        OIDC_CLIENT_SECRET: 'embedded-oauth-test-secret'
      })

      const embeddedOidc = reloadEmbeddedOidcModule()
      await embeddedOidc.initEmbeddedIssuer(app, { db: createEmbeddedOidcStubDb() })

      try {
        await run(issuerBase, server)
      } finally {
        await new Promise((resolve, reject) => {
          server.close((error) => (error ? reject(error) : resolve()))
        })
        embeddedOidc.resetEmbeddedIssuerForTests()
      }
    }

    beforeEach(async () => {
      await $harness
    })

    it('builds embedded oauth client from local metadata without network discovery', async () => {
      await withEmbeddedIssuerServer(async (issuerBase) => {
        const originalGet = config.get.bind(config)
        $sandbox.stub(config, 'get').callsFake((key, defaultValue) => {
          if (key === 'auth.insecureAllowHttp') {
            return true
          }
          return originalGet(key, defaultValue)
        })

        const oidc = reloadOidcModule()
        oidc.initOidc()

        const clientConfig = await oidc.getOauthClientConfiguration()
        expect(clientConfig.serverMetadata().issuer).to.equal(`${issuerBase}/oidc`)
        expect(clientConfig.serverMetadata().token_endpoint).to.equal(`${issuerBase}/oidc/token`)
      })
    })

    it('builds embedded oauth client from local metadata when auth.insecureAllowHttp is false', async () => {
      await withEmbeddedIssuerServer(async (issuerBase) => {
        const oidc = reloadOidcModule()
        oidc.initOidc()

        const clientConfig = await oidc.getOauthClientConfiguration()
        expect(clientConfig.serverMetadata().issuer).to.equal(`${issuerBase}/oidc`)
      })
    })

    it('attaches listener TLS trust for embedded HTTPS without NODE_EXTRA_CA_CERTS', async () => {
      const path = require('path')
      const https = require('https')
      const oidcClient = require('openid-client')
      const { createSSLOptions } = require('../../../src/utils/ssl-utils')
      const { resetEmbeddedOidcFetchForTests } = require('../../../src/config/oidc-fetch')

      const certDir = path.join(__dirname, '../../tls-cert')
      const sslOptions = createSSLOptions({
        key: path.join(certDir, 'tls.key'),
        cert: path.join(certDir, 'tls.crt'),
        intermedKey: path.join(certDir, 'ca.crt'),
        isBase64: false
      })

      applyEmbeddedEnv({
        CONTROLLER_PUBLIC_URL: 'https://localhost:0',
        OIDC_CLIENT_SECRET: 'embedded-oauth-test-secret'
      })

      const originalGetBoolean = config.getBoolean.bind(config)
      $sandbox.stub(config, 'getBoolean').callsFake((key, defaultValue = false) => {
        if (key === 'server.devMode') {
          return false
        }
        return originalGetBoolean(key, defaultValue)
      })

      process.env.TLS_PATH_KEY = path.join(certDir, 'tls.key')
      process.env.TLS_PATH_CERT = path.join(certDir, 'tls.crt')
      process.env.TLS_PATH_INTERMEDIATE_CERT = path.join(certDir, 'ca.crt')

      const server = await new Promise((resolve, reject) => {
        const listener = https.createServer(sslOptions, (req, res) => {
          res.writeHead(200, { 'content-type': 'application/json' })
          res.end(JSON.stringify({ issuer: 'https://localhost:0/oidc' }))
        })
        listener.listen(0, 'localhost', () => resolve(listener))
        listener.on('error', reject)
      })

      const { port } = server.address()
      process.env.CONTROLLER_PUBLIC_URL = `https://localhost:${port}`

      try {
        resetEmbeddedOidcFetchForTests()
        const oidc = reloadOidcModule()
        oidc.initOidc()

        const clientConfig = await oidc.getOauthClientConfiguration()
        expect(clientConfig.serverMetadata().issuer).to.equal(`https://localhost:${port}/oidc`)

        const customFetch = clientConfig[oidcClient.customFetch]
        expect(customFetch).to.be.a('function')

        const response = await customFetch(
          `https://localhost:${port}/oidc/.well-known/openid-configuration`
        )
        expect(response.status).to.equal(200)
      } finally {
        await new Promise((resolve, reject) => {
          server.close((error) => (error ? reject(error) : resolve()))
        })
        delete process.env.TLS_PATH_KEY
        delete process.env.TLS_PATH_CERT
        delete process.env.TLS_PATH_INTERMEDIATE_CERT
        resetEmbeddedOidcFetchForTests()
      }
    })
  })
})
