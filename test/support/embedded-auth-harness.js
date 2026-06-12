const crypto = require('crypto')
const { generateKeyPair, exportJWK, importJWK } = require('jose')
const { Op } = require('sequelize')
const { generateSecret } = require('otplib')

const AuthPasswordService = require('../../src/services/auth-password-service')
const secretHelper = require('../../src/helpers/secret-helper')
const {
  snapshotOidcEnv,
  restoreOidcEnv,
  applyOidcEnv,
  reloadOidcModule
} = require('./oidc-test-helpers')

const EMBEDDED_PUBLIC_URL = 'https://controller.test'
const EMBEDDED_CLIENT_ID = 'controller'
const DEFAULT_TEST_PASSWORD = 'SecurePass123!'

function createRecord (data) {
  const record = {
    ...data,
    dataValues: { ...data },
    createdAt: data.createdAt || new Date(),
    updatedAt: data.updatedAt || new Date()
  }

  record.update = async function (fields) {
    Object.assign(this, fields)
    Object.assign(this.dataValues, fields)
    this.updatedAt = new Date()
    return this
  }

  record.reload = async function () {
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
      delete copy.reload
      delete copy.destroy
      delete copy.get
      return copy
    }
    return this
  }

  return record
}

function getDefaultPolicy () {
  return require('../../src/services/auth-policy-service').DEFAULT_POLICY
}

function stubModelMethod (db, modelName, methodName, sandbox, impl) {
  if (!db[modelName]) {
    db[modelName] = {}
  }
  db[modelName][methodName] = sandbox.stub().callsFake(impl)
}

function createEmbeddedAuthStore () {
  const groups = new Map([
    ['admin', createRecord({ id: 'grp-admin', name: 'admin', isSystem: true })],
    ['sre', createRecord({ id: 'grp-sre', name: 'sre', isSystem: true })],
    ['developer', createRecord({ id: 'grp-developer', name: 'developer', isSystem: true })],
    ['viewer', createRecord({ id: 'grp-viewer', name: 'viewer', isSystem: true })]
  ])

  const users = new Map()
  const userGroups = new Map()
  const mfaByUserId = new Map()
  const refreshTokens = new Map()
  const policy = createRecord({ id: 1, ...getDefaultPolicy() })

  function getUserGroups (userId) {
    const groupIds = userGroups.get(userId) || []
    return groupIds
      .map((groupId) => [...groups.values()].find((group) => group.id === groupId))
      .filter(Boolean)
  }

  function attachUserIncludes (user, include = []) {
    for (const item of include || []) {
      if (item.as === 'groups') {
        user.groups = getUserGroups(user.id)
      }
      if (item.as === 'mfa') {
        user.mfa = mfaByUserId.get(user.id) || null
      }
    }
    return user
  }

  async function seedUser ({
    email,
    password = DEFAULT_TEST_PASSWORD,
    groupNames = ['viewer'],
    mfaEnabled = false,
    totpSecret = null,
    isBootstrap = false,
    mustChangePassword = false
  }) {
    const normalizedEmail = String(email).trim().toLowerCase()
    const userId = crypto.randomUUID()
    const passwordHash = await AuthPasswordService.hashPassword(password)
    const user = createRecord({
      id: userId,
      email: normalizedEmail,
      passwordHash,
      mustChangePassword,
      isBootstrap,
      failedAttempts: 0,
      lockedUntil: null,
      deletedAt: null,
      passwordHistoryHashes: null
    })

    users.set(userId, user)
    userGroups.set(userId, groupNames.map((name) => groups.get(name).id))

    if (mfaEnabled) {
      const secret = totpSecret || generateSecret()
      const totpSecretEncrypted = await secretHelper.encryptSecret(
        { secret },
        `auth-mfa-${userId}`,
        'auth-mfa'
      )
      mfaByUserId.set(userId, createRecord({
        userId,
        enabled: true,
        totpSecretEncrypted,
        recoveryCodesHash: null
      }))
      return { user, password, totpSecret: secret }
    }

    return { user, password }
  }

  return {
    groups,
    users,
    userGroups,
    mfaByUserId,
    refreshTokens,
    policy,
    seedUser,
    getUserGroups,
    attachUserIncludes
  }
}

function createNoopTransaction () {
  return {
    commit: async () => {},
    rollback: async () => {},
    LOCK: { UPDATE: 'UPDATE' }
  }
}

function installEmbeddedAuthStore (sandbox, store) {
  const db = require('../../src/data/models')

  db.sequelize = {
    transaction: sandbox.stub().callsFake(async () => createNoopTransaction())
  }

  stubModelMethod(db, 'AuthPolicy', 'findByPk', sandbox, async () => store.policy)

  stubModelMethod(db, 'AuthGroup', 'findAll', sandbox, async ({ where } = {}) => {
    const names = where && where.name && (where.name[Op.in] || where.name.in)
      ? (where.name[Op.in] || where.name.in)
      : [...store.groups.keys()]
    return names
      .map((name) => store.groups.get(String(name).toLowerCase()))
      .filter(Boolean)
  })

  stubModelMethod(db, 'AuthGroup', 'findOne', sandbox, async ({ where } = {}) => {
    return store.groups.get(where.name) || null
  })

  stubModelMethod(db, 'AuthGroup', 'findOrCreate', sandbox, async ({ where, defaults }) => {
    const existing = store.groups.get(where.name)
    if (existing) {
      return [existing, false]
    }
    const created = createRecord({ id: crypto.randomUUID(), ...defaults })
    store.groups.set(where.name, created)
    return [created, true]
  })

  stubModelMethod(db, 'AuthUser', 'findOne', sandbox, async ({ where, include } = {}) => {
    let user = null
    if (where.id) {
      user = store.users.get(where.id)
    } else if (where.email) {
      user = [...store.users.values()].find((row) => row.email === where.email)
    }

    if (!user) {
      return null
    }
    if (where.deletedAt === null && user.deletedAt) {
      return null
    }
    return store.attachUserIncludes(user, include || [])
  })

  stubModelMethod(db, 'AuthUser', 'findByPk', sandbox, async (userId, { include } = {}) => {
    const user = store.users.get(userId)
    if (!user) {
      return null
    }
    return store.attachUserIncludes(user, include || [])
  })

  stubModelMethod(db, 'AuthUser', 'findAll', sandbox, async ({ where, include, order } = {}) => {
    let rows = [...store.users.values()]
    if (where && where.deletedAt === null) {
      rows = rows.filter((row) => !row.deletedAt)
    }
    if (order) {
      rows = rows.sort((a, b) => a.email.localeCompare(b.email))
    }
    return rows.map((row) => store.attachUserIncludes(row, include || []))
  })

  stubModelMethod(db, 'AuthUser', 'create', sandbox, async (values) => {
    const user = createRecord({
      ...values,
      failedAttempts: 0,
      lockedUntil: null,
      deletedAt: null,
      passwordHistoryHashes: null,
      mustChangePassword: values.mustChangePassword || false,
      isBootstrap: values.isBootstrap || false
    })
    store.users.set(user.id, user)
    return user
  })

  stubModelMethod(db, 'AuthUserGroup', 'create', sandbox, async ({ userId, groupId }) => {
    const links = store.userGroups.get(userId) || []
    links.push(groupId)
    store.userGroups.set(userId, links)
    return { userId, groupId }
  })

  stubModelMethod(db, 'AuthUserGroup', 'destroy', sandbox, async ({ where }) => {
    if (where.userId) {
      store.userGroups.set(where.userId, [])
    }
    return 1
  })

  stubModelMethod(db, 'AuthMfa', 'findOne', sandbox, async ({ where } = {}) => {
    return store.mfaByUserId.get(where.userId) || null
  })

  stubModelMethod(db, 'AuthMfa', 'create', sandbox, async (values) => {
    const record = createRecord(values)
    store.mfaByUserId.set(values.userId, record)
    return record
  })

  stubModelMethod(db, 'AuthRefreshToken', 'create', sandbox, async (values) => {
    const row = createRecord(values)
    store.refreshTokens.set(values.tokenHash, row)
    return row
  })

  stubModelMethod(db, 'AuthRefreshToken', 'findOne', sandbox, async ({ where } = {}) => {
    return store.refreshTokens.get(where.tokenHash) || null
  })

  stubModelMethod(db, 'AuthRefreshToken', 'update', sandbox, async (values, { where } = {}) => {
    for (const row of store.refreshTokens.values()) {
      const matchesFamily = !where.familyId || row.familyId === where.familyId
      const matchesUser = !where.userId || row.userId === where.userId
      const matchesRevoked = where.revoked === undefined || row.revoked === where.revoked
      if (matchesFamily && matchesUser && matchesRevoked) {
        Object.assign(row, values)
      }
    }
    return [1]
  })
}

async function installEmbeddedSigningKey (sandbox) {
  const AuthJwks = require('../../src/config/auth-jwks')
  const { publicKey, privateKey } = await generateKeyPair('RS256')
  const privateJwk = await exportJWK(privateKey)
  privateJwk.kid = 'embedded-test-kid'
  privateJwk.alg = 'RS256'
  privateJwk.use = 'sig'

  sandbox.stub(AuthJwks, 'getActiveSigningMaterial').callsFake(async () => ({
    kid: privateJwk.kid,
    privateJwk,
    signingKey: privateKey
  }))

  return { privateKey, privateJwk, publicKey }
}

function applyEmbeddedEnv (overrides = {}) {
  applyOidcEnv({
    AUTH_MODE: 'embedded',
    CONTROLLER_PUBLIC_URL: EMBEDDED_PUBLIC_URL,
    OIDC_CLIENT_ID: EMBEDDED_CLIENT_ID,
    ...overrides
  })
}

function applyExternalEnv (overrides = {}) {
  applyOidcEnv({
    AUTH_MODE: 'external',
    CONTROLLER_PUBLIC_URL: EMBEDDED_PUBLIC_URL,
    OIDC_ISSUER_URL: 'https://idp.example.com/realms/test',
    OIDC_CLIENT_ID: EMBEDDED_CLIENT_ID,
    OIDC_CLIENT_SECRET: 'external-test-secret',
    ...overrides
  })
}

function reloadAuthModules ({ keepJwks = false } = {}) {
  const modules = [
    '../../src/services/user-service',
    '../../src/services/auth-login-service',
    '../../src/services/auth-user-service',
    '../../src/services/auth-migration-service',
    '../../src/services/auth-token-service',
    '../../src/config/oidc'
  ]

  if (!keepJwks) {
    modules.push('../../src/config/auth-jwks')
  }

  for (const modulePath of modules) {
    const resolved = require.resolve(modulePath)
    delete require.cache[resolved]
  }

  return {
    UserService: require('../../src/services/user-service'),
    AuthLoginService: require('../../src/services/auth-login-service'),
    AuthUserService: require('../../src/services/auth-user-service'),
    AuthMigrationService: require('../../src/services/auth-migration-service'),
    oidc: reloadOidcModule()
  }
}

function resetEmbeddedAuthCaches () {
  require('../../src/config/oidc').resetDiscoveryForTests()
  require('../../src/config/auth-jwks').resetSigningMaterialCacheForTests()
  require('../../src/config/auth-session-store').resetAuthSessionStoreForTests()
  require('../../src/services/auth-interaction-state-store').resetInteractionStateForTests()
}

async function createEmbeddedAuthHarness (sandbox, options = {}) {
  const store = createEmbeddedAuthStore()
  installEmbeddedAuthStore(sandbox, store)

  applyEmbeddedEnv(options.env || {})
  resetEmbeddedAuthCaches()

  const signing = await installEmbeddedSigningKey(sandbox)
  const modules = reloadAuthModules({ keepJwks: true })

  return {
    store,
    signing,
    modules,
    async seedViewerUser (email = 'viewer@example.com') {
      return store.seedUser({ email, groupNames: ['viewer'] })
    },
    async seedAdminUser (email = 'admin@example.com', { mfaEnabled = false, totpSecret } = {}) {
      return store.seedUser({
        email,
        groupNames: ['admin'],
        mfaEnabled,
        totpSecret
      })
    }
  }
}

function teardownEmbeddedAuth (envSnapshot) {
  resetEmbeddedAuthCaches()
  restoreOidcEnv(envSnapshot)
}

module.exports = {
  EMBEDDED_PUBLIC_URL,
  EMBEDDED_CLIENT_ID,
  DEFAULT_TEST_PASSWORD,
  snapshotOidcEnv,
  applyEmbeddedEnv,
  applyExternalEnv,
  createEmbeddedAuthStore,
  createEmbeddedAuthHarness,
  installEmbeddedSigningKey,
  reloadAuthModules,
  resetEmbeddedAuthCaches,
  teardownEmbeddedAuth
}
