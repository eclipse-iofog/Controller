'use strict'

const { expect } = require('chai')
const sinon = require('sinon')
const { decodeJwt } = require('jose')
const AuthPasswordService = require('../../../src/services/auth-password-service')
const {
  snapshotOidcEnv,
  DEFAULT_TEST_PASSWORD,
  createEmbeddedAuthHarness,
  teardownEmbeddedAuth
} = require('../../support/embedded-auth-harness')

const BOOTSTRAP_PASSWORD = 'ChangeMeSecure123!'

function createRecord (data) {
  const record = {
    ...data,
    dataValues: { ...data }
  }

  record.update = async function (fields) {
    Object.assign(this, fields)
    Object.assign(this.dataValues, fields)
    return this
  }

  record.destroy = async function () {
    record._deleted = true
    return undefined
  }

  record.get = function ({ plain } = {}) {
    if (plain) {
      const copy = { ...this }
      delete copy.dataValues
      delete copy.update
      delete copy.destroy
      delete copy.get
      return copy
    }
    return this
  }

  return record
}

function createNoopTransaction () {
  return {
    commit: async () => {},
    rollback: async () => {},
    LOCK: { UPDATE: 'UPDATE' }
  }
}

const DB_MODEL_KEYS = [
  'sequelize',
  'AuthGroup',
  'AuthBootstrapMeta',
  'AuthUser',
  'AuthUserGroup',
  'AuthMfa',
  'AuthPasswordResetSession',
  'AuthRefreshToken',
  'AuthPolicy'
]

function snapshotDbModels () {
  const db = require('../../../src/data/models')
  return Object.fromEntries(DB_MODEL_KEYS.map((key) => [key, db[key]]))
}

function restoreDbModels (snapshot) {
  if (!snapshot) {
    return
  }
  const db = require('../../../src/data/models')
  for (const key of DB_MODEL_KEYS) {
    db[key] = snapshot[key]
  }
}

function installBootstrapDb (sandbox, state) {
  const db = require('../../../src/data/models')

  db.sequelize = {
    transaction: sandbox.stub().callsFake(async () => createNoopTransaction())
  }

  db.AuthGroup = {
    findOrCreate: sandbox.stub().callsFake(async ({ where, defaults }) => {
      const existing = state.groups.get(where.name)
      if (existing) {
        return [existing, false]
      }
      const created = createRecord({ id: `grp-${where.name}`, ...defaults })
      state.groups.set(where.name, created)
      return [created, true]
    }),
    findOne: sandbox.stub().callsFake(async ({ where }) => state.groups.get(where.name) || null)
  }

  db.AuthBootstrapMeta = {
    findByPk: sandbox.stub().callsFake(async () => state.meta),
    create: sandbox.stub().callsFake(async (values) => {
      state.meta = createRecord(values)
      return state.meta
    })
  }

  db.AuthUser = {
    findOne: sandbox.stub().callsFake(async ({ where }) => {
      if (where.isBootstrap) {
        return state.bootstrapUser && !state.bootstrapUser._deleted ? state.bootstrapUser : null
      }
      if (where.email) {
        const user = [...state.users.values()].find((row) => row.email === where.email && !row._deleted)
        if (!user) {
          return null
        }
        if (where.deletedAt === null && user.deletedAt) {
          return null
        }
        return user
      }
      return null
    }),
    create: sandbox.stub().callsFake(async (values) => {
      const user = createRecord({
        ...values,
        deletedAt: null
      })
      state.users.set(user.id, user)
      if (values.isBootstrap) {
        state.bootstrapUser = user
      }
      return user
    })
  }

  db.AuthUserGroup = {
    create: sandbox.stub().resolves({}),
    destroy: sandbox.stub().resolves(1)
  }

  db.AuthMfa = {
    destroy: sandbox.stub().resolves(1)
  }

  db.AuthPasswordResetSession = {
    destroy: sandbox.stub().resolves(1)
  }

  db.AuthRefreshToken = {
    destroy: sandbox.stub().resolves(1),
    update: sandbox.stub().resolves([1])
  }
  state.authRefreshTokenUpdate = db.AuthRefreshToken.update

  db.AuthPolicy = {
    findByPk: sandbox.stub().callsFake(async () => state.policy)
  }
}

function reloadBootstrapService () {
  delete require.cache[require.resolve('../../../src/services/auth-bootstrap-service')]
  return require('../../../src/services/auth-bootstrap-service')
}

describe('auth-bootstrap-service', () => {
  def('sandbox', () => sinon.createSandbox())
  def('dbSnapshot', () => snapshotDbModels())

  afterEach(() => {
    $sandbox.restore()
    restoreDbModels($dbSnapshot)
    delete process.env.OIDC_BOOTSTRAP_ADMIN_USERNAME
    delete process.env.OIDC_BOOTSTRAP_ADMIN_PASSWORD
    delete require.cache[require.resolve('../../../src/services/auth-bootstrap-service')]
  })

  it('creates bootstrap admin with non-email username on first boot', async () => {
    const state = {
      groups: new Map([
        ['admin', createRecord({ id: 'grp-admin', name: 'admin', isSystem: true })]
      ]),
      users: new Map(),
      bootstrapUser: null,
      meta: null,
      policy: createRecord({ id: 1, ...require('../../../src/services/auth-policy-service').DEFAULT_POLICY })
    }

    installBootstrapDb($sandbox, state)
    process.env.OIDC_BOOTSTRAP_ADMIN_USERNAME = 'admin'
    process.env.OIDC_BOOTSTRAP_ADMIN_PASSWORD = BOOTSTRAP_PASSWORD

    const { runBootstrap } = reloadBootstrapService()
    const result = await runBootstrap()

    expect(result).to.deep.include({ skipped: false, username: 'admin' })
    expect(state.bootstrapUser.email).to.equal('admin')
    expect(state.bootstrapUser.isBootstrap).to.equal(true)
    expect(await AuthPasswordService.verifyPassword(BOOTSTRAP_PASSWORD, state.bootstrapUser.passwordHash)).to.equal(true)
    expect(state.meta.bootstrapAdminUserId).to.equal(state.bootstrapUser.id)
  })

  it('keeps existing bootstrap when env credentials are missing', async () => {
    const existing = createRecord({
      id: 'bootstrap-1',
      email: 'admin',
      passwordHash: await AuthPasswordService.hashPassword(BOOTSTRAP_PASSWORD),
      isBootstrap: true
    })

    const state = {
      groups: new Map([
        ['admin', createRecord({ id: 'grp-admin', name: 'admin', isSystem: true })]
      ]),
      users: new Map([[existing.id, existing]]),
      bootstrapUser: existing,
      meta: createRecord({ id: 1, completedAt: new Date(), bootstrapAdminUserId: existing.id }),
      policy: createRecord({ id: 1, ...require('../../../src/services/auth-policy-service').DEFAULT_POLICY })
    }

    installBootstrapDb($sandbox, state)

    const { runBootstrap } = reloadBootstrapService()
    const result = await runBootstrap()

    expect(result).to.deep.equal({ skipped: true, reason: 'env_missing_keep_existing' })
    expect(existing._deleted).to.not.equal(true)
  })

  it('skips rotation when env matches existing bootstrap credentials', async () => {
    const existing = createRecord({
      id: 'bootstrap-1',
      email: 'admin',
      passwordHash: await AuthPasswordService.hashPassword(BOOTSTRAP_PASSWORD),
      isBootstrap: true
    })

    const state = {
      groups: new Map([
        ['admin', createRecord({ id: 'grp-admin', name: 'admin', isSystem: true })]
      ]),
      users: new Map([[existing.id, existing]]),
      bootstrapUser: existing,
      meta: createRecord({ id: 1 }),
      policy: createRecord({ id: 1, ...require('../../../src/services/auth-policy-service').DEFAULT_POLICY })
    }

    installBootstrapDb($sandbox, state)
    process.env.OIDC_BOOTSTRAP_ADMIN_USERNAME = 'admin'
    process.env.OIDC_BOOTSTRAP_ADMIN_PASSWORD = BOOTSTRAP_PASSWORD

    const { runBootstrap } = reloadBootstrapService()
    const result = await runBootstrap()

    expect(result).to.deep.include({ skipped: true, reason: 'unchanged', userId: existing.id, username: 'admin' })
    expect(state.authRefreshTokenUpdate.called).to.equal(false)
    expect(existing._deleted).to.not.equal(true)
  })

  it('rotates bootstrap when env password changes', async () => {
    const existing = createRecord({
      id: 'bootstrap-1',
      email: 'admin',
      passwordHash: await AuthPasswordService.hashPassword('OldPassword123!'),
      isBootstrap: true
    })

    const state = {
      groups: new Map([
        ['admin', createRecord({ id: 'grp-admin', name: 'admin', isSystem: true })]
      ]),
      users: new Map([[existing.id, existing]]),
      bootstrapUser: existing,
      meta: createRecord({ id: 1, completedAt: new Date(), bootstrapAdminUserId: existing.id }),
      policy: createRecord({ id: 1, ...require('../../../src/services/auth-policy-service').DEFAULT_POLICY })
    }

    installBootstrapDb($sandbox, state)
    process.env.OIDC_BOOTSTRAP_ADMIN_USERNAME = 'admin'
    process.env.OIDC_BOOTSTRAP_ADMIN_PASSWORD = BOOTSTRAP_PASSWORD

    const { runBootstrap } = reloadBootstrapService()
    const result = await runBootstrap()

    expect(result).to.deep.include({ skipped: false, username: 'admin' })
    expect(state.authRefreshTokenUpdate.calledOnce).to.equal(true)
    expect(state.authRefreshTokenUpdate.firstCall.args[0]).to.deep.equal({ revoked: true })
    expect(state.authRefreshTokenUpdate.firstCall.args[1].where).to.deep.equal({
      userId: existing.id,
      revoked: false
    })
    expect(existing._deleted).to.equal(true)
    expect(state.bootstrapUser.id).to.not.equal(existing.id)
    expect(state.bootstrapUser.email).to.equal('admin')
    expect(await AuthPasswordService.verifyPassword(BOOTSTRAP_PASSWORD, state.bootstrapUser.passwordHash)).to.equal(true)
  })
})

describe('Bootstrap username login + JWT claims', () => {
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

  it('allows login with non-email username and omits email JWT claim', async () => {
    const { store, modules } = await $harness
    await store.seedUser({
      email: 'admin',
      groupNames: ['admin'],
      isBootstrap: true
    })

    const result = await modules.UserService.login({
      email: 'admin',
      password: DEFAULT_TEST_PASSWORD
    }, false)

    const claims = decodeJwt(result.accessToken)
    expect(claims.preferred_username).to.equal('admin')
    expect(claims).to.not.have.property('email')
    expect(result.accessToken).to.be.a('string').that.is.not.empty
  })

  it('includes email JWT claim when identifier contains @', async () => {
    const { store, modules } = await $harness
    await store.seedUser({
      email: 'bootstrap@example.com',
      groupNames: ['admin'],
      isBootstrap: true
    })

    const result = await modules.UserService.login({
      email: 'bootstrap@example.com',
      password: DEFAULT_TEST_PASSWORD
    }, false)

    const claims = decodeJwt(result.accessToken)
    expect(claims.preferred_username).to.equal('bootstrap@example.com')
    expect(claims.email).to.equal('bootstrap@example.com')
  })
})
