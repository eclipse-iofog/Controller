'use strict'

const { expect } = require('chai')
const sinon = require('sinon')
const {
  snapshotOidcEnv,
  teardownEmbeddedAuth
} = require('../../support/embedded-auth-harness')

describe('Auth session store', () => {
  def('envSnapshot', () => snapshotOidcEnv())

  afterEach(() => {
    teardownEmbeddedAuth($envSnapshot)
    delete process.env.AUTH_SESSION_STORE_TYPE
    delete process.env.DB_PROVIDER
    delete process.env.AUTH_SESSION_SECRET
    delete require.cache[require.resolve('../../../src/config/auth-session-store')]
    delete require.cache[require.resolve('../../../src/data/stores/sequelize-session-store')]
  })

  it('defaults to memory store type for sqlite', () => {
    const authSessionStore = require('../../../src/config/auth-session-store')
    expect(authSessionStore.getSessionStoreConfig()).to.deep.equal({
      type: 'memory',
      ttlMs: 10 * 60 * 1000
    })
  })

  it('defaults to database store type for postgres', () => {
    process.env.DB_PROVIDER = 'postgres'
    const authSessionStore = require('../../../src/config/auth-session-store')
    expect(authSessionStore.getSessionStoreConfig().type).to.equal('database')
  })

  it('allows explicit memory override with external database provider', () => {
    process.env.DB_PROVIDER = 'mysql'
    process.env.AUTH_SESSION_STORE_TYPE = 'memory'
    const authSessionStore = require('../../../src/config/auth-session-store')
    expect(authSessionStore.getSessionStoreConfig().type).to.equal('memory')
  })

  it('creates a memory store by default', () => {
    const authSessionStore = require('../../../src/config/auth-session-store')
    authSessionStore.setSessionSecretForTests('test-session-secret')
    const store = authSessionStore.initAuthSessionStore()
    expect(store).to.have.property('get')
    expect(store).to.have.property('set')
    expect(store).to.have.property('destroy')
  })

  it('rejects invalid store types', () => {
    process.env.AUTH_SESSION_STORE_TYPE = 'redis'
    const authSessionStore = require('../../../src/config/auth-session-store')
    expect(() => authSessionStore.getSessionStoreConfig()).to.throw('Invalid auth.sessionStore.type')
  })

  it('round-trips session data through the database store', async () => {
    process.env.AUTH_SESSION_STORE_TYPE = 'database'

    const rows = new Map()
    const model = {
      findByPk: sinon.stub().callsFake(async (sid) => rows.get(sid) || null),
      upsert: sinon.stub().callsFake(async (row) => {
        rows.set(row.sid, row)
        return [row]
      }),
      destroy: sinon.stub().callsFake(async ({ where }) => {
        if (where.sid) {
          rows.delete(where.sid)
        }
      }),
      update: sinon.stub().callsFake(async (fields, { where }) => {
        const existing = rows.get(where.sid)
        if (existing) {
          rows.set(where.sid, { ...existing, ...fields })
        }
        return [1]
      })
    }

    const db = require('../../../src/data/models')
    const originalModel = db.AuthBffSession
    db.AuthBffSession = model

    const authSessionStore = require('../../../src/config/auth-session-store')
    authSessionStore.setSessionSecretForTests('test-session-secret')
    authSessionStore.resetAuthSessionStoreForTests()
    const store = authSessionStore.initAuthSessionStore()

    const sessionData = { cookie: { maxAge: 600000 }, controllerOauth: { state: 'abc', nonce: 'xyz' } }
    await new Promise((resolve, reject) => {
      store.set('session-1', sessionData, (error) => (error ? reject(error) : resolve()))
    })

    const loaded = await new Promise((resolve, reject) => {
      store.get('session-1', (error, value) => (error ? reject(error) : resolve(value)))
    })

    db.AuthBffSession = originalModel
    authSessionStore.resetAuthSessionStoreForTests()
    expect(loaded).to.deep.equal(sessionData)
  })

  it('generates and persists session secret when unset', async () => {
    const meta = {
      id: 1,
      sessionSecretRef: null,
      update: sinon.stub().resolves()
    }

    const db = require('../../../src/data/models')
    const originalMeta = db.AuthBootstrapMeta
    db.AuthBootstrapMeta = {
      findByPk: sinon.stub().resolves(meta),
      create: sinon.stub().resolves(meta)
    }

    const secretHelper = require('../../../src/helpers/secret-helper')
    const encryptStub = sinon.stub(secretHelper, 'encryptSecret').callsFake(async (data) => `enc:${data.secret}`)
    const decryptStub = sinon.stub(secretHelper, 'decryptSecret').callsFake(async (ref) => ({ secret: ref.replace('enc:', '') }))

    const authSessionStore = require('../../../src/config/auth-session-store')
    authSessionStore.resetAuthSessionStoreForTests()
    const secret = await authSessionStore.resolveSessionSecret()

    expect(secret).to.be.a('string').that.is.not.empty
    expect(encryptStub).to.have.been.calledOnce
    expect(authSessionStore.getSessionSecret()).to.equal(secret)

    encryptStub.restore()
    decryptStub.restore()
    db.AuthBootstrapMeta = originalMeta
    authSessionStore.resetAuthSessionStoreForTests()
  })

  it('reuses persisted session secret on restart', async () => {
    const db = require('../../../src/data/models')
    const originalMeta = db.AuthBootstrapMeta
    db.AuthBootstrapMeta = {
      findByPk: sinon.stub().resolves({
        id: 1,
        sessionSecretRef: 'enc:persisted-secret'
      }),
      create: sinon.stub()
    }

    const secretHelper = require('../../../src/helpers/secret-helper')
    const decryptStub = sinon.stub(secretHelper, 'decryptSecret').resolves({ secret: 'persisted-secret' })

    const authSessionStore = require('../../../src/config/auth-session-store')
    authSessionStore.resetAuthSessionStoreForTests()
    const secret = await authSessionStore.resolveSessionSecret()

    expect(secret).to.equal('persisted-secret')

    decryptStub.restore()
    db.AuthBootstrapMeta = originalMeta
    authSessionStore.resetAuthSessionStoreForTests()
  })
})
