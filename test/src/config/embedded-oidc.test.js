const { expect } = require('chai')
const sinon = require('sinon')
const express = require('express')
const http = require('http')

const {
  snapshotOidcEnv,
  restoreOidcEnv,
  applyOidcEnv,
  reloadOidcModule
} = require('../../support/oidc-test-helpers')

function requestJson (app, path, headers = {}) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, '127.0.0.1', () => {
      const { port } = server.address()
      http.get({
        hostname: '127.0.0.1',
        port,
        path,
        headers
      }, (res) => {
        const chunks = []
        res.on('data', (chunk) => chunks.push(chunk))
        res.on('end', () => {
          server.close()
          resolve({
            status: res.statusCode,
            body: JSON.parse(Buffer.concat(chunks).toString('utf8'))
          })
        })
      }).on('error', (error) => {
        server.close()
        reject(error)
      })
    })
  })
}

function reloadEmbeddedOidcModule () {
  const embeddedPath = require.resolve('../../../src/config/embedded-oidc')
  delete require.cache[embeddedPath]
  return require('../../../src/config/embedded-oidc')
}

function createStubDb () {
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

describe('Embedded OIDC issuer', () => {
  def('sandbox', () => sinon.createSandbox())
  def('envSnapshot', () => snapshotOidcEnv())
  def('publicUrl', () => 'http://controller.test')

  beforeEach(() => {
    applyOidcEnv({
      AUTH_MODE: 'embedded',
      CONTROLLER_PUBLIC_URL: $publicUrl
    })
    reloadOidcModule()
  })

  afterEach(() => {
    $sandbox.restore()
    restoreOidcEnv($envSnapshot)
    reloadEmbeddedOidcModule().resetEmbeddedIssuerForTests()
  })

  it('serves the discovery document at /oidc/.well-known/openid-configuration', async () => {
    const embeddedOidc = reloadEmbeddedOidcModule()
    const app = express()
    const db = createStubDb()

    await embeddedOidc.initEmbeddedIssuer(app, { db })

    const res = await requestJson(app, '/oidc/.well-known/openid-configuration', {
      Host: 'controller.test'
    })

    expect(res.status).to.equal(200)
    expect(res.body.issuer).to.equal(`${$publicUrl}/oidc`)
    expect(res.body.jwks_uri).to.equal(`${$publicUrl}/oidc/jwks`)
    expect(res.body.token_endpoint).to.equal(`${$publicUrl}/oidc/token`)
    expect(res.body.revocation_endpoint).to.equal(`${$publicUrl}/oidc/revoke`)
    expect(res.body.grant_types_supported).to.include('authorization_code')
  })

  it('persists a generated signing key when none exists', async () => {
    const embeddedOidc = reloadEmbeddedOidcModule()
    const app = express()
    const db = createStubDb()

    await embeddedOidc.initEmbeddedIssuer(app, { db })

    expect(db.AuthOidcKey.create).to.have.been.calledOnce
    expect(db.AuthOidcKey.create.firstCall.args[0]).to.include({
      active: true
    })
    expect(db.AuthOidcKey.create.firstCall.args[0].keyMaterialEncrypted).to.be.a('string')
  })

  it('registers the optional ecn-viewer public client when enabled', async () => {
    applyOidcEnv({
      AUTH_MODE: 'embedded',
      CONTROLLER_PUBLIC_URL: $publicUrl,
      AUTH_VIEWER_CLIENT_ENABLED: 'true',
      OIDC_VIEWER_CLIENT_ID: 'ecn-viewer'
    })

    const embeddedOidc = reloadEmbeddedOidcModule()
    const app = express()
    const db = createStubDb()

    await embeddedOidc.initEmbeddedIssuer(app, { db })

    expect(db.AuthOidcClient.create).to.have.been.called
    const createdClientIds = db.AuthOidcClient.create.getCalls().map((call) => call.args[0].clientId)
    expect(createdClientIds).to.include('controller')
    expect(createdClientIds).to.include('ecn-viewer')
  })
})
