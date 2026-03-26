/*
 *  *******************************************************************************
 *  * Copyright (c) 2023 Contributors to the Eclipse ioFog Project
 *  *
 *  * This program and the accompanying materials are made available under the
 *  * terms of the Eclipse Public License v. 2.0 which is available at
 *  * http://www.eclipse.org/legal/epl-2.0
 *  *
 *  * SPDX-License-Identifier: EPL-2.0
 *  *******************************************************************************
 *
 */

const { createOperator, createAccount, createUser, fromSeed, encodeOperator, encodeAccount, encodeUser, fmtCreds } = require('@nats-io/jwt')
const AppHelper = require('../helpers/app-helper')
const Errors = require('../helpers/errors')
const ErrorMessages = require('../helpers/error-messages')
const config = require('../config')
const SecretService = require('./secret-service')
const ApplicationManager = require('../data/managers/application-manager')
const NatsOperatorManager = require('../data/managers/nats-operator-manager')
const NatsAccountManager = require('../data/managers/nats-account-manager')
const NatsUserManager = require('../data/managers/nats-user-manager')
const NatsAccountRuleManager = require('../data/managers/nats-account-rule-manager')
const NatsUserRuleManager = require('../data/managers/nats-user-rule-manager')
const MicroserviceManager = require('../data/managers/microservice-manager')
const TransactionDecorator = require('../decorators/transaction-decorator')
const logger = require('../logger')
const NatsSystemRules = require('../config/nats-system-rules')
const { slugifyName } = require('../helpers/system-naming')

const OPERATOR_SEED_SECRET = 'nats-operator-seed'
const SYSTEM_ACCOUNT_NAME = 'SYS'
const SYSTEM_ACCOUNT_SEED_SECRET = 'nats-system-account-seed'
const leafSystemAccountName = (fog) => `SYS-leaf-${slugifyName(fog.name)}`
function sysUserNameForServer (isHub, fog) {
  return isHub ? 'admin-hub' : `admin-server-${slugifyName(fog.name)}`
}
const leafSystemAccountSeedSecretName = (fog) => `nats-leaf-system-seed-${slugifyName(fog.name)}`
const leafSystemAccountUserName = (fog) => `admin-leaf-${slugifyName(fog.name)}`
const accountSeedSecretName = (applicationName) => `nats-account-seed-${slugifyName(applicationName)}`
const mqttBearerSecretName = (applicationName, userName) => `nats-mqtt-creds-${slugifyName(applicationName)}-${slugifyName(userName)}`
const microserviceCredsSecretName = (applicationName, microserviceName) => `nats-creds-${slugifyName(applicationName)}-${slugifyName(microserviceName)}`

function _parseJsonText (value, fallback) {
  if (!value) {
    return fallback
  }
  try {
    return JSON.parse(value)
  } catch (error) {
    return fallback
  }
}

function _credsSecretData (accountName, userName, credsString) {
  const key = `${slugifyName(accountName, 64)}/${slugifyName(userName, 64)}.creds`
  return { [key]: credsString }
}

function _buildAccountRuleClaims (rule) {
  if (!rule) {
    return {}
  }
  const limits = {
    conn: rule.maxConnections,
    leaf: rule.maxLeafNodeConnections,
    data: rule.maxData,
    exports: rule.maxExports,
    imports: rule.maxImports,
    payload: rule.maxMsgPayload,
    subs: rule.maxSubscriptions,
    wildcards: rule.exportsAllowWildcards,
    disallow_bearer: rule.disallowBearer
  }
  if (rule.memStorage != null || rule.diskStorage != null || rule.streams != null ||
      rule.consumer != null || rule.maxAckPending != null || rule.memMaxStreamBytes != null ||
      rule.diskMaxStreamBytes != null || rule.maxBytesRequired != null) {
    limits.mem_storage = rule.memStorage
    limits.disk_storage = rule.diskStorage
    limits.streams = rule.streams
    limits.consumer = rule.consumer
    limits.max_ack_pending = rule.maxAckPending
    limits.mem_max_stream_bytes = rule.memMaxStreamBytes
    limits.disk_max_stream_bytes = rule.diskMaxStreamBytes
    limits.max_bytes_required = rule.maxBytesRequired
  }
  if (rule.tieredLimits) {
    const tiered = _parseJsonText(rule.tieredLimits, undefined)
    if (tiered && typeof tiered === 'object') {
      limits.tiered_limits = tiered
    }
  }
  const defaultPerms = {
    pub: {
      allow: _parseJsonText(rule.pubAllow, undefined),
      deny: _parseJsonText(rule.pubDeny, undefined)
    },
    sub: {
      allow: _parseJsonText(rule.subAllow, undefined),
      deny: _parseJsonText(rule.subDeny, undefined)
    }
  }
  if (rule.respMax != null || rule.respTtl != null) {
    defaultPerms.resp = {
      max: rule.respMax,
      ttl: rule.respTtl
    }
  }
  const out = {
    limits,
    default_permissions: defaultPerms
  }
  if (rule.description != null) out.description = rule.description
  if (rule.infoUrl != null) out.info_url = rule.infoUrl
  const importsVal = rule.imports != null ? (Array.isArray(rule.imports) ? rule.imports : _parseJsonText(rule.imports, undefined)) : undefined
  if (Array.isArray(importsVal) && importsVal.length > 0) out.imports = importsVal
  const exportsVal = rule.exports != null ? (Array.isArray(rule.exports) ? rule.exports : _parseJsonText(rule.exports, undefined)) : undefined
  if (Array.isArray(exportsVal) && exportsVal.length > 0) out.exports = exportsVal
  return out
}

function _buildUserRuleClaims (rule, baseClaims = {}) {
  if (!rule) {
    return baseClaims
  }
  const out = {
    ...baseClaims,
    bearer_token: rule.bearerToken || baseClaims.bearer_token,
    allowed_connection_types: _parseJsonText(rule.allowedConnectionTypes, baseClaims.allowed_connection_types),
    pub: {
      allow: _parseJsonText(rule.pubAllow, undefined),
      deny: _parseJsonText(rule.pubDeny, undefined)
    },
    sub: {
      allow: _parseJsonText(rule.subAllow, undefined),
      deny: _parseJsonText(rule.subDeny, undefined)
    },
    subs: rule.maxSubscriptions,
    data: rule.maxData,
    payload: rule.maxPayload
  }
  if (rule.proxyRequired != null) out.proxy_required = rule.proxyRequired
  const src = _parseJsonText(rule.src, undefined)
  if (Array.isArray(src)) out.src = src
  const times = _parseJsonText(rule.times, undefined)
  if (Array.isArray(times)) out.times = times
  if (rule.timesLocation != null) out.times_location = rule.timesLocation
  if (rule.respMax != null || rule.respTtl != null) {
    out.resp = { max: rule.respMax, ttl: rule.respTtl }
  }
  const tags = _parseJsonText(rule.tags, undefined)
  if (Array.isArray(tags)) out.tags = tags
  return out
}

function _decodeJwtPayload (jwt) {
  try {
    if (!jwt || typeof jwt !== 'string') {
      return {}
    }
    const parts = jwt.split('.')
    if (parts.length < 2) {
      return {}
    }
    return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'))
  } catch (error) {
    logger.warn(`Failed to decode JWT payload: ${error.message}`)
    return {}
  }
}

function _extractAccountRevocations (accountJwt) {
  const payload = _decodeJwtPayload(accountJwt)
  return (payload && payload.nats && payload.nats.revocations) || {}
}

async function _resolveNatsUserRule (ruleName, defaultRuleName, transaction) {
  if (ruleName) {
    const explicitRule = await NatsUserRuleManager.findOne({ name: ruleName }, transaction)
    if (!explicitRule) {
      throw new Errors.ValidationError(`NATS user rule ${ruleName} does not exist`)
    }
    return explicitRule
  }

  return NatsUserRuleManager.findOne({ name: defaultRuleName }, transaction)
}

async function _encodeAccountJwtWithRuleAndRevocations (accountName, accountKp, operatorKp, rule, existingAccountJwt) {
  const existingRevocations = _extractAccountRevocations(existingAccountJwt)
  return encodeAccount(
    accountName,
    accountKp,
    {
      ..._buildAccountRuleClaims(rule),
      revocations: existingRevocations
    },
    { signer: operatorKp }
  )
}

function _normalizeSystemUserRuleForPersistence (rule) {
  return {
    ...rule,
    allowedConnectionTypes: rule.allowedConnectionTypes ? JSON.stringify(rule.allowedConnectionTypes) : undefined
  }
}

/**
 * NATS reconciliation is triggered in two ways:
 * (A) From this module: _triggerResolverArtifactsReconcile calls NatsService.enqueueReconcileTask (fire-and-forget).
 *     Call sites: ensureOperator, rotateOperator, ensureSystemAccount, createUserForAccount, ensureAccountForApplication,
 *     createAccountForApplication, ensureUserForMicroservice, createMqttBearerUser, ensureLeafSystemAccount,
 *     reissueAccountForApplication, reissueUserForMicroservice, deleteAccountForApplication, revokeMicroserviceUser,
 *     reissueForAccountRule, reissueForUserRule, revokeUserByAccountAndName, deleteLeafSystemArtifactsForFog, etc.
 * (B) From nats-service: enqueueReconcileTask(..., transaction) inside ensureNatsForFog (cluster-routes-changed) and
 *     cleanupNatsForFog (server-deleted).
 * All API endpoints that trigger reconciliation use the transaction-queue bypass (bypassQueue: true) so requests
 * do not wait behind long-running reconcile jobs.
 */
function _triggerResolverArtifactsReconcile (triggerOptions = {}) {
  if (triggerOptions.triggerReconcile === false) {
    return
  }
  const NatsService = require('./nats-service')
  if (NatsService && typeof NatsService.enqueueReconcileTask === 'function') {
    const options = { reason: 'auth-mutation', ...triggerOptions }
    NatsService.enqueueReconcileTask(options).catch((err) => {
      logger.error(`NATS reconcile enqueue failed: ${err.message}`)
    })
  }
}

function _runBackgroundTask (label, task) {
  setImmediate(async () => {
    try {
      logger.info(`Starting background NATS task: ${label}`)
      await task()
      logger.info(`Completed background NATS task: ${label}`)
    } catch (error) {
      logger.error(`Background NATS task failed (${label}): ${error.message}`)
    }
  })
}

async function _loadSeedFromSecret (secretName, transaction) {
  const secret = await SecretService.getSecretEndpoint(secretName, transaction)
  if (!secret || !secret.data || !secret.data.seed) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.SECRET_NOT_FOUND, secretName))
  }
  return secret.data.seed
}

async function _upsertOpaqueSecret (name, data, transaction) {
  try {
    await SecretService.createSecretEndpoint({
      name,
      type: 'Opaque',
      data
    }, transaction)
  } catch (error) {
    if (error.name === 'ConflictError') {
      await SecretService.updateSecretEndpointIfChanged(name, {
        name,
        type: 'Opaque',
        data
      }, transaction)
    } else {
      throw error
    }
  }
}

function _triggerOptionsFromArgs (args) {
  const second = args[0]
  return (second && typeof second === 'object' && !second.fakeTransaction) ? second : {}
}

async function ensureOperator (transaction, ...rest) {
  const options = _triggerOptionsFromArgs(rest)
  const existing = await NatsOperatorManager.findOne({}, transaction)
  if (existing) {
    return existing
  }

  const operatorName = `${config.get('app.name')}-operator`
  const operatorKp = createOperator()
  const operatorJwt = await encodeOperator(operatorName, operatorKp)
  const operatorSeed = new TextDecoder().decode(operatorKp.getSeed())

  await _upsertOpaqueSecret(OPERATOR_SEED_SECRET, { seed: operatorSeed }, transaction)

  const created = await NatsOperatorManager.create({
    name: operatorName,
    publicKey: operatorKp.getPublicKey(),
    jwt: operatorJwt,
    seedSecretName: OPERATOR_SEED_SECRET
  }, transaction)
  _triggerResolverArtifactsReconcile(options)
  return created
}

async function rotateOperator (transaction) {
  const existing = await NatsOperatorManager.findOne({}, transaction)
  if (!existing) {
    return ensureOperator(transaction)
  }

  const operatorName = existing.name
  const operatorKp = createOperator()
  const operatorJwt = await encodeOperator(operatorName, operatorKp)
  const operatorSeed = new TextDecoder().decode(operatorKp.getSeed())

  await SecretService.updateSecretEndpointIfChanged(existing.seedSecretName, {
    name: existing.seedSecretName,
    type: 'Opaque',
    data: { seed: operatorSeed }
  }, transaction)

  await NatsOperatorManager.update({ id: existing.id }, {
    publicKey: operatorKp.getPublicKey(),
    jwt: operatorJwt
  }, transaction)

  const accounts = await NatsAccountManager.findAll({}, transaction)
  logger.info(`Rotating NATS operator and re-signing ${accounts.length} accounts`)
  for (const account of accounts) {
    const accountSeed = await _loadSeedFromSecret(account.seedSecretName, transaction)
    const accountKp = fromSeed(new TextEncoder().encode(accountSeed))
    const app = account.applicationId ? await ApplicationManager.findOne({ id: account.applicationId }, transaction) : null
    const accountRule = account.isSystem
      ? await NatsAccountRuleManager.findOne({ name: NatsSystemRules.SYSTEM_ACCOUNT_RULE_NAME }, transaction)
      : (app && app.natsRuleId
        ? await NatsAccountRuleManager.findOne({ id: app.natsRuleId }, transaction)
        : await NatsAccountRuleManager.findOne({ name: NatsSystemRules.APPLICATION_ACCOUNT_RULE_NAME }, transaction))
    const newAccountJwt = await _encodeAccountJwtWithRuleAndRevocations(
      account.name,
      accountKp,
      operatorKp,
      accountRule,
      account.jwt
    )
    await NatsAccountManager.update({ id: account.id }, { jwt: newAccountJwt }, transaction)
  }

  _triggerResolverArtifactsReconcile()

  return NatsOperatorManager.findOne({ id: existing.id }, transaction)
}

async function ensureSystemAccount (transaction, ...rest) {
  const options = _triggerOptionsFromArgs(rest)
  await ensureDefaultRules(transaction)
  const existing = await NatsAccountManager.findOne({ isSystem: true }, transaction)
  if (existing) {
    return existing
  }

  const operator = await ensureOperator(transaction, options)
  const operatorSeed = await _loadSeedFromSecret(operator.seedSecretName, transaction)
  const operatorKp = fromSeed(new TextEncoder().encode(operatorSeed))

  const accountKp = createAccount()
  const systemRule = await NatsAccountRuleManager.findOne({ name: NatsSystemRules.SYSTEM_ACCOUNT_RULE_NAME }, transaction)
  const accountJwt = await encodeAccount(SYSTEM_ACCOUNT_NAME, accountKp, { ..._buildAccountRuleClaims(systemRule), exports: NatsSystemRules.SYS_ACCOUNT_EXPORTS_INLINE }, { signer: operatorKp })
  const accountSeed = new TextDecoder().decode(accountKp.getSeed())

  await _upsertOpaqueSecret(SYSTEM_ACCOUNT_SEED_SECRET, { seed: accountSeed }, transaction)

  const created = await NatsAccountManager.create({
    name: SYSTEM_ACCOUNT_NAME,
    publicKey: accountKp.getPublicKey(),
    jwt: accountJwt,
    seedSecretName: SYSTEM_ACCOUNT_SEED_SECRET,
    operatorId: operator.id,
    isSystem: true,
    isLeafSystem: false,
    applicationId: null
  }, transaction)
  _triggerResolverArtifactsReconcile({ ...options, reason: 'system-account-created' })
  return created
}

async function ensureLeafSystemAccount (fog, transaction) {
  await ensureDefaultRules(transaction)
  const operator = await ensureOperator(transaction)
  const name = leafSystemAccountName(fog)
  const existing = await NatsAccountManager.findOne({ name, operatorId: operator.id, isLeafSystem: true }, transaction)
  if (existing) {
    return existing
  }

  const operatorSeed = await _loadSeedFromSecret(operator.seedSecretName, transaction)
  const operatorKp = fromSeed(new TextEncoder().encode(operatorSeed))

  const accountKp = createAccount()
  const systemRule = await NatsAccountRuleManager.findOne({ name: NatsSystemRules.SYSTEM_ACCOUNT_RULE_NAME }, transaction)
  const accountJwt = await encodeAccount(name, accountKp, { ..._buildAccountRuleClaims(systemRule), exports: NatsSystemRules.SYS_ACCOUNT_EXPORTS_INLINE }, { signer: operatorKp })
  const accountSeed = new TextDecoder().decode(accountKp.getSeed())

  const seedSecretName = leafSystemAccountSeedSecretName(fog)
  await _upsertOpaqueSecret(seedSecretName, { seed: accountSeed }, transaction)

  const created = await NatsAccountManager.create({
    name,
    publicKey: accountKp.getPublicKey(),
    jwt: accountJwt,
    seedSecretName,
    operatorId: operator.id,
    isSystem: false,
    isLeafSystem: true,
    applicationId: null
  }, transaction)
  _triggerResolverArtifactsReconcile({ fogUuids: [fog.uuid] })
  return created
}

async function ensureSysUserForServer (options = {}, transaction) {
  const { isHub = true, fog } = options
  const account = await ensureSystemAccount(transaction)
  const sysUserName = sysUserNameForServer(isHub, fog)
  const existingUser = await NatsUserManager.findOne({ accountId: account.id, name: sysUserName }, transaction)
  const created = !existingUser
  const { user } = existingUser
    ? { user: existingUser }
    : await createUserForAccount(account.id, sysUserName, null, null, null, transaction)
  if (created && fog && fog.uuid) {
    _triggerResolverArtifactsReconcile({ fogUuids: [fog.uuid] })
  }
  return { account, user }
}

async function ensureLeafSystemAccountUser (fog, transaction) {
  const account = await ensureLeafSystemAccount(fog, transaction)
  const userName = leafSystemAccountUserName(fog)
  const existing = await NatsUserManager.findOne({ accountId: account.id, name: userName }, transaction)
  if (existing) {
    return { account, user: existing }
  }
  const result = await createUserForAccount(account.id, userName, null, null, null, transaction)
  _triggerResolverArtifactsReconcile({ fogUuids: [fog.uuid] })
  return result
}

/**
 * Returns secret names for leaf system artifacts (creds + account seed) if a leaf system account exists for this fog.
 * Used by nats-service to clean up mounts/secrets when deleting a leaf or transitioning leaf→server.
 * @param {object} fog
 * @param {object} transaction
 * @returns {{ credsSecretName: string, seedSecretName: string } | null}
 */
async function getLeafSystemArtifactSecretNames (fog, transaction) {
  const operator = await NatsOperatorManager.findOne({}, transaction)
  if (!operator) return null
  const name = leafSystemAccountName(fog)
  const account = await NatsAccountManager.findOne({ name, operatorId: operator.id, isLeafSystem: true }, transaction)
  if (!account) return null
  const userName = leafSystemAccountUserName(fog)
  const user = await NatsUserManager.findOne({ accountId: account.id, name: userName }, transaction)
  if (!user || !user.credsSecretName) return { credsSecretName: null, seedSecretName: account.seedSecretName }
  return { credsSecretName: user.credsSecretName, seedSecretName: account.seedSecretName }
}

/**
 * Deletes leaf system account, its user(s), and their secrets for a fog. Idempotent if already gone.
 * Call when cleaning up a leaf instance or when transitioning a fog from leaf to server.
 * @param {object} fog
 * @param {object} transaction
 */
async function deleteLeafSystemArtifactsForFog (fog, transaction) {
  const operator = await NatsOperatorManager.findOne({}, transaction)
  if (!operator) return
  const name = leafSystemAccountName(fog)
  const account = await NatsAccountManager.findOne({ name, operatorId: operator.id, isLeafSystem: true }, transaction)
  if (!account) return
  const users = await NatsUserManager.findAll({ accountId: account.id }, transaction)
  for (const user of users || []) {
    if (user.credsSecretName) {
      try {
        await SecretService.deleteSecretEndpoint(user.credsSecretName, transaction)
      } catch (error) {
        // best-effort cleanup
      }
    }
    await NatsUserManager.delete({ id: user.id }, transaction)
  }
  if (account.seedSecretName) {
    try {
      await SecretService.deleteSecretEndpoint(account.seedSecretName, transaction)
    } catch (error) {
      // best-effort cleanup
    }
  }
  await NatsAccountManager.delete({ id: account.id }, transaction)
  _triggerResolverArtifactsReconcile({ fogUuids: [fog.uuid] })
}

/**
 * Deletes the system account user (and its creds secret) for a NATS server node.
 * Used when cleaning up a fog that had a NATS server (hub or non-hub). Idempotent if already gone.
 * @param {object} fog
 * @param {boolean} isHub - whether the deleted instance was a hub
 * @param {object} transaction
 */
async function deleteServerSysUserForFog (fog, isHub, transaction) {
  const systemAccount = await NatsAccountManager.findOne({ isSystem: true }, transaction)
  if (!systemAccount) return
  const sysUserName = sysUserNameForServer(isHub, fog)
  const user = await NatsUserManager.findOne({ accountId: systemAccount.id, name: sysUserName }, transaction)
  if (!user) return
  if (user.credsSecretName) {
    try {
      await SecretService.deleteSecretEndpoint(user.credsSecretName, transaction)
    } catch (error) {
      // best-effort cleanup
    }
  }
  await NatsUserManager.delete({ id: user.id }, transaction)
  _triggerResolverArtifactsReconcile({ fogUuids: [fog.uuid] })
}

async function ensureAccountForApplication (applicationId, transaction) {
  await ensureDefaultRules(transaction)
  const existing = await NatsAccountManager.findOne({ applicationId }, transaction)
  if (existing) {
    return existing
  }

  const application = await ApplicationManager.findOne({ id: applicationId }, transaction)
  if (!application) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_FLOW_ID, applicationId))
  }

  const operator = await ensureOperator(transaction)
  const operatorSeed = await _loadSeedFromSecret(operator.seedSecretName, transaction)
  const operatorKp = fromSeed(new TextEncoder().encode(operatorSeed))

  const accountKp = createAccount()
  const defaultAccountRule = await NatsAccountRuleManager.findOne({ name: NatsSystemRules.APPLICATION_ACCOUNT_RULE_NAME }, transaction)
  const accountRule = application.natsRuleId
    ? await NatsAccountRuleManager.findOne({ id: application.natsRuleId }, transaction)
    : defaultAccountRule
  const accountJwt = await encodeAccount(application.name, accountKp, _buildAccountRuleClaims(accountRule), { signer: operatorKp })
  const accountSeed = new TextDecoder().decode(accountKp.getSeed())

  const seedSecretName = accountSeedSecretName(application.name)
  await _upsertOpaqueSecret(seedSecretName, { seed: accountSeed }, transaction)

  const created = await NatsAccountManager.create({
    name: application.name,
    publicKey: accountKp.getPublicKey(),
    jwt: accountJwt,
    seedSecretName: seedSecretName,
    operatorId: operator.id,
    applicationId: application.id,
    isSystem: false,
    isLeafSystem: false
  }, transaction)
  _triggerResolverArtifactsReconcile({ reason: 'account-created', applicationId: application.id })
  return created
}

async function ensureUserForMicroservice (microservice, transaction) {
  await ensureDefaultRules(transaction)
  if (!microservice.applicationId) {
    throw new Errors.ValidationError('Microservice must belong to an application to enable NATS')
  }

  const account = await ensureAccountForApplication(microservice.applicationId, transaction)
  const existingUser = await NatsUserManager.findOne({ microserviceUuid: microservice.uuid }, transaction)
  if (existingUser) {
    const existingAccount = await NatsAccountManager.findOne({ id: existingUser.accountId }, transaction)
    if (!existingAccount || existingUser.accountId !== account.id) {
      const reissued = await reissueUserForMicroservice(microservice.uuid, transaction)
      return { account, user: reissued }
    }
    return { account: existingAccount, user: existingUser }
  }

  const accountSeed = await _loadSeedFromSecret(account.seedSecretName, transaction)
  const accountKp = fromSeed(new TextEncoder().encode(accountSeed))

  const userKp = createUser()
  const userName = microservice.name
  const defaultUserRule = await NatsUserRuleManager.findOne({ name: NatsSystemRules.MICROSERVICE_USER_RULE_NAME }, transaction)
  const userRule = microservice.natsRuleId
    ? await NatsUserRuleManager.findOne({ id: microservice.natsRuleId }, transaction)
    : defaultUserRule
  const userJwt = await encodeUser(userName, userKp, accountKp, _buildUserRuleClaims(userRule, {}))
  const creds = fmtCreds(userJwt, userKp)
  const credsString = Buffer.from(creds).toString('utf8')

  const application = await ApplicationManager.findOne({ id: microservice.applicationId }, transaction)
  const credsSecretName = microserviceCredsSecretName(application ? application.name : 'app', microservice.name)
  const accountName = application ? application.name : account.name
  await _upsertOpaqueSecret(credsSecretName, _credsSecretData(accountName, userName, credsString), transaction)

  const natsUser = await NatsUserManager.create({
    name: userName,
    publicKey: userKp.getPublicKey(),
    jwt: userJwt,
    credsSecretName: credsSecretName,
    isBearer: false,
    accountId: account.id,
    microserviceUuid: microservice.uuid,
    natsUserRuleId: userRule ? userRule.id : null
  }, transaction)

  _triggerResolverArtifactsReconcile({ fogUuids: [microservice.iofogUuid] })
  return { account, user: natsUser }
}

function _parseExpiresIn (expiresIn) {
  if (!expiresIn) {
    return 7 * 24 * 60 * 60
  }
  const match = /^(\d+)([hdm])$/.exec(expiresIn)
  if (!match) {
    throw new Errors.ValidationError('expiresIn must be in format: <number><h|d|m>')
  }
  const value = Number(match[1])
  const unit = match[2]
  if (!Number.isFinite(value) || value <= 0) {
    throw new Errors.ValidationError('expiresIn must be greater than zero')
  }
  switch (unit) {
    case 'h':
      if (value > 24 * 365 * 3) {
        throw new Errors.ValidationError('expiresIn cannot exceed 26280h (3 years)')
      }
      return value * 60 * 60
    case 'd':
      if (value > 365 * 3) {
        throw new Errors.ValidationError('expiresIn cannot exceed 1095d (3 years)')
      }
      return value * 24 * 60 * 60
    case 'm':
      if (value > 36) {
        throw new Errors.ValidationError('expiresIn cannot exceed 36m (3 years)')
      }
      return value * 30 * 24 * 60 * 60
    default:
      throw new Errors.ValidationError('expiresIn must be in format: <number><h|d|m>')
  }
}

function _userClaimsWithExpiry (expiresIn, claims = {}) {
  if (expiresIn == null) {
    return { ...claims }
  }
  const expSeconds = _parseExpiresIn(expiresIn)
  const exp = Math.floor(Date.now() / 1000) + expSeconds
  return { ...claims, exp }
}

async function createMqttBearerUser (applicationId, userName, expiresIn, natsRuleName, transaction) {
  await ensureDefaultRules(transaction)
  const account = await ensureAccountForApplication(applicationId, transaction)
  const application = await ApplicationManager.findOne({ id: applicationId }, transaction)
  const existingUser = await NatsUserManager.findOne({ accountId: account.id, name: userName }, transaction)
  if (existingUser) {
    return { account, user: existingUser, bearerJwt: existingUser.jwt }
  }
  const accountSeed = await _loadSeedFromSecret(account.seedSecretName, transaction)
  const accountKp = fromSeed(new TextEncoder().encode(accountSeed))

  const userKp = createUser()
  const userRule = await _resolveNatsUserRule(
    natsRuleName,
    NatsSystemRules.MQTT_BEARER_USER_RULE_NAME,
    transaction
  )
  const userJwt = await encodeUser(userName, userKp, accountKp, _buildUserRuleClaims(userRule, _userClaimsWithExpiry(expiresIn, {
    bearer_token: true,
    allowed_connection_types: ['MQTT']
  })))
  const creds = fmtCreds(userJwt, userKp)
  const credsString = Buffer.from(creds).toString('utf8')

  const credsSecretName = mqttBearerSecretName(application ? application.name : `account-${account.id}`, userName)
  const accountName = application ? application.name : account.name
  await _upsertOpaqueSecret(credsSecretName, _credsSecretData(accountName, userName, credsString), transaction)

  const natsUser = await NatsUserManager.create({
    name: userName,
    publicKey: userKp.getPublicKey(),
    jwt: userJwt,
    credsSecretName: credsSecretName,
    isBearer: true,
    accountId: account.id,
    microserviceUuid: null,
    natsUserRuleId: userRule ? userRule.id : null
  }, transaction)

  return { account, user: natsUser, bearerJwt: userJwt }
}

async function ensureDefaultRules (transaction) {
  for (const accountRule of NatsSystemRules.getSystemAccountRuleDefinitions()) {
    const data = { name: accountRule.name, ...accountRule }
    if (Array.isArray(data.exports)) data.exports = JSON.stringify(data.exports)
    if (Array.isArray(data.imports)) data.imports = JSON.stringify(data.imports)
    await NatsAccountRuleManager.updateOrCreate({ name: accountRule.name }, data, transaction)
  }
  for (const userRule of NatsSystemRules.getSystemUserRuleDefinitions()) {
    const data = _normalizeSystemUserRuleForPersistence(userRule)
    await NatsUserRuleManager.updateOrCreate({ name: userRule.name }, { name: userRule.name, ...data }, transaction)
  }
}

async function createUserForAccount (accountId, userName, expiresIn, natsRuleName, microserviceUuid = null, transaction) {
  await ensureDefaultRules(transaction)
  const account = await NatsAccountManager.findOne({ id: accountId }, transaction)
  if (!account) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_FLOW_ID, accountId))
  }
  const existingUser = await NatsUserManager.findOne({ accountId: account.id, name: userName }, transaction)
  if (existingUser) {
    return { account, user: existingUser }
  }

  const accountSeed = await _loadSeedFromSecret(account.seedSecretName, transaction)
  const accountKp = fromSeed(new TextEncoder().encode(accountSeed))

  const userKp = createUser()
  const userRule = await _resolveNatsUserRule(
    natsRuleName,
    NatsSystemRules.MICROSERVICE_USER_RULE_NAME,
    transaction
  )
  const userJwt = await encodeUser(userName, userKp, accountKp, _buildUserRuleClaims(userRule, _userClaimsWithExpiry(expiresIn)))
  const creds = fmtCreds(userJwt, userKp)
  const credsString = Buffer.from(creds).toString('utf8')

  const application = account.applicationId ? await ApplicationManager.findOne({ id: account.applicationId }, transaction) : null
  const credsSecretName = `nats-creds-${slugifyName(application ? application.name : account.name)}-${slugifyName(userName)}`
  const accountName = application ? application.name : account.name
  await _upsertOpaqueSecret(credsSecretName, _credsSecretData(accountName, userName, credsString), transaction)

  if (microserviceUuid != null && typeof microserviceUuid !== 'string') {
    microserviceUuid = null
  }
  const natsUser = await NatsUserManager.create({
    name: userName,
    publicKey: userKp.getPublicKey(),
    jwt: userJwt,
    credsSecretName: credsSecretName,
    isBearer: false,
    accountId: account.id,
    microserviceUuid: microserviceUuid,
    natsUserRuleId: userRule ? userRule.id : null
  }, transaction)

  return { account, user: natsUser }
}

async function reissueAccountForApplication (applicationId, transaction) {
  await ensureDefaultRules(transaction)
  const application = await ApplicationManager.findOne({ id: applicationId }, transaction)
  if (!application) {
    return null
  }
  const account = await NatsAccountManager.findOne({ applicationId: application.id }, transaction)
  if (!account) {
    return null
  }

  const operator = await ensureOperator(transaction)
  const operatorSeed = await _loadSeedFromSecret(operator.seedSecretName, transaction)
  const operatorKp = fromSeed(new TextEncoder().encode(operatorSeed))
  const accountSeed = await _loadSeedFromSecret(account.seedSecretName, transaction)
  const accountKp = fromSeed(new TextEncoder().encode(accountSeed))
  const defaultAccountRule = await NatsAccountRuleManager.findOne({ name: NatsSystemRules.APPLICATION_ACCOUNT_RULE_NAME }, transaction)
  const accountRule = application.natsRuleId
    ? await NatsAccountRuleManager.findOne({ id: application.natsRuleId }, transaction)
    : defaultAccountRule

  const accountJwt = await _encodeAccountJwtWithRuleAndRevocations(
    application.name,
    accountKp,
    operatorKp,
    accountRule,
    account.jwt
  )
  await NatsAccountManager.update({ id: account.id }, { jwt: accountJwt }, transaction)
  _triggerResolverArtifactsReconcile({ reason: 'account-created', applicationId })
  return NatsAccountManager.findOne({ id: account.id }, transaction)
}

async function reissueUserForMicroservice (microserviceUuid, transaction, ...rest) {
  const options = _triggerOptionsFromArgs(rest)
  await ensureDefaultRules(transaction)
  const microservice = await MicroserviceManager.findOne({ uuid: microserviceUuid }, transaction)
  if (!microservice || !microservice.applicationId || !microservice.natsAccess) {
    return null
  }

  const account = await ensureAccountForApplication(microservice.applicationId, transaction)
  const defaultUserRule = await NatsUserRuleManager.findOne({ name: NatsSystemRules.MICROSERVICE_USER_RULE_NAME }, transaction)
  const userRule = microservice.natsRuleId
    ? await NatsUserRuleManager.findOne({ id: microservice.natsRuleId }, transaction)
    : defaultUserRule
  const existingUser = await NatsUserManager.findOne({ microserviceUuid: microservice.uuid }, transaction)

  const currentRuleId = (userRule && userRule.id) || null
  const existingRuleId = (existingUser && existingUser.natsUserRuleId != null) ? existingUser.natsUserRuleId : null
  const sameRule = (existingRuleId === currentRuleId)

  if (!existingUser) {
    const accountSeed = await _loadSeedFromSecret(account.seedSecretName, transaction)
    const accountKp = fromSeed(new TextEncoder().encode(accountSeed))
    const userKp = createUser()
    const userJwt = await encodeUser(microservice.name, userKp, accountKp, _buildUserRuleClaims(userRule || defaultUserRule, {}))
    const creds = fmtCreds(userJwt, userKp)
    const credsString = Buffer.from(creds).toString('utf8')
    const application = await ApplicationManager.findOne({ id: microservice.applicationId }, transaction)
    const credsSecretName = microserviceCredsSecretName(application ? application.name : 'app', microservice.name)
    const accountName = application ? application.name : account.name
    await _upsertOpaqueSecret(credsSecretName, _credsSecretData(accountName, microservice.name, credsString), transaction)
    await NatsUserManager.create({
      name: microservice.name,
      publicKey: userKp.getPublicKey(),
      jwt: userJwt,
      credsSecretName: credsSecretName,
      isBearer: false,
      accountId: account.id,
      microserviceUuid: microservice.uuid,
      natsUserRuleId: currentRuleId
    }, transaction)
    _triggerResolverArtifactsReconcile({ reason: 'account-created', applicationId: microservice.applicationId, ...options })
    return NatsUserManager.findOne({ microserviceUuid: microservice.uuid }, transaction)
  }

  if (existingUser.accountId !== account.id) {
    const oldAccount = await NatsAccountManager.findOne({ id: existingUser.accountId }, transaction)
    if (oldAccount) {
      await _addRevocationToAccount(oldAccount, existingUser.publicKey, transaction)
      if (options.triggerReconcile !== false && oldAccount.applicationId != null) {
        _triggerResolverArtifactsReconcile({ reason: 'account-created', applicationId: oldAccount.applicationId, ...options })
      }
    }
    const accountSeed = await _loadSeedFromSecret(account.seedSecretName, transaction)
    const accountKp = fromSeed(new TextEncoder().encode(accountSeed))
    const userKp = createUser()
    const userJwt = await encodeUser(microservice.name, userKp, accountKp, _buildUserRuleClaims(userRule || defaultUserRule, {}))
    const creds = fmtCreds(userJwt, userKp)
    const credsString = Buffer.from(creds).toString('utf8')
    const application = await ApplicationManager.findOne({ id: microservice.applicationId }, transaction)
    const fallbackSecretName = microserviceCredsSecretName(application ? application.name : 'app', microservice.name)
    const credsSecretName = existingUser.credsSecretName || fallbackSecretName
    const accountName = application ? application.name : account.name
    await _upsertOpaqueSecret(credsSecretName, _credsSecretData(accountName, microservice.name, credsString), transaction)
    await NatsUserManager.update({ id: existingUser.id }, {
      name: microservice.name,
      publicKey: userKp.getPublicKey(),
      jwt: userJwt,
      credsSecretName: credsSecretName,
      accountId: account.id,
      natsUserRuleId: currentRuleId
    }, transaction)
    _triggerResolverArtifactsReconcile({ reason: 'account-created', applicationId: microservice.applicationId, ...options })
    return NatsUserManager.findOne({ microserviceUuid: microservice.uuid }, transaction)
  }

  if (!sameRule && userRule && userRule.id) {
    const operator = await ensureOperator(transaction)
    if (!operator) return null
    const operatorSeed = await _loadSeedFromSecret(operator.seedSecretName, transaction)
    const operatorKp = fromSeed(new TextEncoder().encode(operatorSeed))
    await _reissueOneUserForRule(existingUser, userRule.id, operatorKp, transaction)
    _triggerResolverArtifactsReconcile({ reason: 'account-created', applicationId: microservice.applicationId, ...options })
    return NatsUserManager.findOne({ microserviceUuid: microservice.uuid }, transaction)
  }

  _triggerResolverArtifactsReconcile({ reason: 'account-created', applicationId: microservice.applicationId, ...options })
  return NatsUserManager.findOne({ microserviceUuid: microservice.uuid }, transaction)
}

async function ensureLeafUserForAccount (accountId, fogName, transaction, natsInstanceMicroserviceUuid = null) {
  const leafUserName = `leaf-${fogName}`
  const existing = await NatsUserManager.findOne({ accountId: accountId, name: leafUserName }, transaction)
  if (existing) {
    if (natsInstanceMicroserviceUuid != null && existing.microserviceUuid !== natsInstanceMicroserviceUuid) {
      await NatsUserManager.update({ id: existing.id }, { microserviceUuid: natsInstanceMicroserviceUuid }, transaction)
      return { user: await NatsUserManager.findOne({ id: existing.id }, transaction) }
    }
    return { user: existing }
  }
  try {
    return await createUserForAccount(accountId, leafUserName, null, NatsSystemRules.DEFAULT_LEAF_USER_RULE_NAME, natsInstanceMicroserviceUuid, transaction)
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      const user = await NatsUserManager.findOne({ accountId, name: leafUserName }, transaction)
      if (user) {
        logger.warn(`Leaf user already created by concurrent request, using existing user (accountId=${accountId}, name=${leafUserName})`)
        return { user }
      }
      logger.error(`Unique constraint violation for leaf user but existing user not found (accountId=${accountId}, name=${leafUserName})`)
    }
    logger.error(`ensureLeafUserForAccount failed (accountId=${accountId}, leafUserName=${leafUserName}): ${err.message}`)
    throw err
  }
}

async function reissueForAccountRule (accountRuleId, transaction) {
  const applications = await ApplicationManager.findAll({ natsRuleId: accountRuleId }, transaction)
  logger.info(`Reissuing account JWTs for rule ${accountRuleId}`)
  for (const app of applications) {
    const account = await NatsAccountManager.findOne({ applicationId: app.id }, transaction)
    if (!account) {
      continue
    }
    const operator = await ensureOperator(transaction)
    const operatorSeed = await _loadSeedFromSecret(operator.seedSecretName, transaction)
    const operatorKp = fromSeed(new TextEncoder().encode(operatorSeed))
    const accountSeed = await _loadSeedFromSecret(account.seedSecretName, transaction)
    const accountKp = fromSeed(new TextEncoder().encode(accountSeed))
    const rule = await NatsAccountRuleManager.findOne({ id: accountRuleId }, transaction)
    const accountJwt = await _encodeAccountJwtWithRuleAndRevocations(
      app.name,
      accountKp,
      operatorKp,
      rule,
      account.jwt
    )
    await NatsAccountManager.update({ id: account.id }, { jwt: accountJwt }, transaction)
  }
  _triggerResolverArtifactsReconcile({ reason: 'account-rule-updated', accountRuleId })
}

/**
 * Add a user public key to an account's JWT revocations and persist. Returns the account's applicationId for triggering.
 */
async function _addRevocationToAccount (account, publicKey, transaction) {
  const operator = await ensureOperator(transaction)
  const operatorSeed = await _loadSeedFromSecret(operator.seedSecretName, transaction)
  const operatorKp = fromSeed(new TextEncoder().encode(operatorSeed))
  const accountSeed = await _loadSeedFromSecret(account.seedSecretName, transaction)
  const accountKp = fromSeed(new TextEncoder().encode(accountSeed))
  const app = account.applicationId ? await ApplicationManager.findOne({ id: account.applicationId }, transaction) : null
  const accountRule = account.isSystem
    ? await NatsAccountRuleManager.findOne({ name: NatsSystemRules.SYSTEM_ACCOUNT_RULE_NAME }, transaction)
    : (app && app.natsRuleId
      ? await NatsAccountRuleManager.findOne({ id: app.natsRuleId }, transaction)
      : await NatsAccountRuleManager.findOne({ name: NatsSystemRules.APPLICATION_ACCOUNT_RULE_NAME }, transaction))
  const revocations = _extractAccountRevocations(account.jwt)
  revocations[publicKey] = Math.floor(Date.now() / 1000)
  const accountJwt = await encodeAccount(
    account.name,
    accountKp,
    { ..._buildAccountRuleClaims(accountRule), revocations },
    { signer: operatorKp }
  )
  await NatsAccountManager.update({ id: account.id }, { jwt: accountJwt }, transaction)
  return account.applicationId
}

async function _reissueOneUserForRule (user, userRuleId, operatorKp, transaction) {
  const account = await NatsAccountManager.findOne({ id: user.accountId }, transaction)
  if (!account) return
  const accountSeed = await _loadSeedFromSecret(account.seedSecretName, transaction)
  const accountKp = fromSeed(new TextEncoder().encode(accountSeed))
  const app = account.applicationId ? await ApplicationManager.findOne({ id: account.applicationId }, transaction) : null
  const accountRule = account.isSystem
    ? await NatsAccountRuleManager.findOne({ name: NatsSystemRules.SYSTEM_ACCOUNT_RULE_NAME }, transaction)
    : (app && app.natsRuleId
      ? await NatsAccountRuleManager.findOne({ id: app.natsRuleId }, transaction)
      : await NatsAccountRuleManager.findOne({ name: NatsSystemRules.APPLICATION_ACCOUNT_RULE_NAME }, transaction))
  const revocations = _extractAccountRevocations(account.jwt)
  revocations[user.publicKey] = Math.floor(Date.now() / 1000)
  const accountJwt = await encodeAccount(
    account.name,
    accountKp,
    { ..._buildAccountRuleClaims(accountRule), revocations },
    { signer: operatorKp }
  )
  await NatsAccountManager.update({ id: account.id }, { jwt: accountJwt }, transaction)
  const userRule = await NatsUserRuleManager.findOne({ id: userRuleId }, transaction)
  const userKp = createUser()
  const userJwt = await encodeUser(user.name, userKp, accountKp, _buildUserRuleClaims(userRule, {}))
  const creds = fmtCreds(userJwt, userKp)
  const credsString = Buffer.from(creds).toString('utf8')
  await _upsertOpaqueSecret(user.credsSecretName, _credsSecretData(account.name, user.name, credsString), transaction)
  await NatsUserManager.update({ id: user.id }, {
    jwt: userJwt,
    publicKey: userKp.getPublicKey(),
    natsUserRuleId: userRuleId
  }, transaction)
}

async function reissueForUserRule (userRuleId, transaction) {
  const microservices = await MicroserviceManager.findAll({ natsRuleId: userRuleId }, transaction)
  logger.info(`Reissuing user JWTs for rule ${userRuleId}`)
  const operator = await ensureOperator(transaction)
  const operatorSeed = await _loadSeedFromSecret(operator.seedSecretName, transaction)
  const operatorKp = fromSeed(new TextEncoder().encode(operatorSeed))
  const processedUserIds = new Set()

  for (const ms of microservices) {
    const user = await NatsUserManager.findOne({ microserviceUuid: ms.uuid }, transaction)
    if (!user || processedUserIds.has(user.id)) continue
    await _reissueOneUserForRule(user, userRuleId, operatorKp, transaction)
    processedUserIds.add(user.id)
  }

  const usersWithRuleId = await NatsUserManager.findAll({ natsUserRuleId: userRuleId }, transaction)
  for (const user of usersWithRuleId || []) {
    if (processedUserIds.has(user.id)) continue
    await _reissueOneUserForRule(user, userRuleId, operatorKp, transaction)
    processedUserIds.add(user.id)
  }
  _triggerResolverArtifactsReconcile({ reason: 'user-rule-updated', userRuleId })
}

async function revokeMicroserviceUser (microserviceUuid, transaction) {
  const user = await NatsUserManager.findOne({ microserviceUuid }, transaction)
  if (!user) {
    return
  }
  const account = await NatsAccountManager.findOne({ id: user.accountId }, transaction)
  if (!account) {
    await NatsUserManager.delete({ id: user.id }, transaction)
    return
  }

  const operator = await ensureOperator(transaction)
  const operatorSeed = await _loadSeedFromSecret(operator.seedSecretName, transaction)
  const operatorKp = fromSeed(new TextEncoder().encode(operatorSeed))
  const accountSeed = await _loadSeedFromSecret(account.seedSecretName, transaction)
  const accountKp = fromSeed(new TextEncoder().encode(accountSeed))

  const app = account.applicationId ? await ApplicationManager.findOne({ id: account.applicationId }, transaction) : null
  const accountRule = account.isSystem
    ? await NatsAccountRuleManager.findOne({ name: NatsSystemRules.SYSTEM_ACCOUNT_RULE_NAME }, transaction)
    : (app && app.natsRuleId
      ? await NatsAccountRuleManager.findOne({ id: app.natsRuleId }, transaction)
      : await NatsAccountRuleManager.findOne({ name: NatsSystemRules.APPLICATION_ACCOUNT_RULE_NAME }, transaction))
  const revocations = _extractAccountRevocations(account.jwt)
  revocations[user.publicKey] = Math.floor(Date.now() / 1000)
  const accountJwt = await encodeAccount(
    account.name,
    accountKp,
    {
      ..._buildAccountRuleClaims(accountRule),
      revocations
    },
    { signer: operatorKp }
  )
  await NatsAccountManager.update({ id: account.id }, { jwt: accountJwt }, transaction)

  try {
    await SecretService.deleteSecretEndpoint(user.credsSecretName, transaction)
  } catch (error) {
    // best-effort secret cleanup
  }
  await NatsUserManager.delete({ id: user.id }, transaction)
  _triggerResolverArtifactsReconcile({ reason: 'account-created', applicationId: account.applicationId })
}

async function deleteAccountForApplication (applicationId, transaction) {
  const account = await NatsAccountManager.findOne({ applicationId }, transaction)
  if (!account) {
    return
  }
  const users = await NatsUserManager.findAll({ accountId: account.id }, transaction)
  for (const user of users || []) {
    if (user.credsSecretName) {
      try {
        await SecretService.deleteSecretEndpoint(user.credsSecretName, transaction)
      } catch (error) {
        // best-effort cleanup
      }
    }
    await NatsUserManager.delete({ id: user.id }, transaction)
  }
  try {
    await SecretService.deleteSecretEndpoint(account.seedSecretName, transaction)
  } catch (error) {
    // best-effort cleanup
  }
  await NatsAccountManager.delete({ id: account.id }, transaction)
  _triggerResolverArtifactsReconcile({ reason: 'account-deleted', applicationId })
}

async function revokeUserByAccountAndName (accountId, userName, transaction) {
  const user = await NatsUserManager.findOne({ accountId, name: userName }, transaction)
  if (!user) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_MICROSERVICE_NAME, userName))
  }
  if (user.microserviceUuid) {
    const microservice = await MicroserviceManager.findOne({ uuid: user.microserviceUuid }, transaction)
    if (microservice) {
      throw new Errors.ValidationError(
        'Cannot delete NATS user linked to an existing microservice. Disable natsAccess on the microservice or delete the microservice first.'
      )
    }
  }

  const account = await NatsAccountManager.findOne({ id: user.accountId }, transaction)
  if (!account) {
    await NatsUserManager.delete({ id: user.id }, transaction)
    return
  }
  if (account.isSystem) {
    throw new Errors.ValidationError('Cannot delete system account users')
  }

  if (account.isLeafSystem) {
    throw new Errors.ValidationError('Cannot delete leaf system account users')
  }

  const operator = await ensureOperator(transaction)
  const operatorSeed = await _loadSeedFromSecret(operator.seedSecretName, transaction)
  const operatorKp = fromSeed(new TextEncoder().encode(operatorSeed))
  const accountSeed = await _loadSeedFromSecret(account.seedSecretName, transaction)
  const accountKp = fromSeed(new TextEncoder().encode(accountSeed))

  const app = account.applicationId ? await ApplicationManager.findOne({ id: account.applicationId }, transaction) : null
  const accountRule = account.isSystem
    ? await NatsAccountRuleManager.findOne({ name: NatsSystemRules.SYSTEM_ACCOUNT_RULE_NAME }, transaction)
    : (app && app.natsRuleId
      ? await NatsAccountRuleManager.findOne({ id: app.natsRuleId }, transaction)
      : await NatsAccountRuleManager.findOne({ name: NatsSystemRules.APPLICATION_ACCOUNT_RULE_NAME }, transaction))
  const revocations = _extractAccountRevocations(account.jwt)
  revocations[user.publicKey] = Math.floor(Date.now() / 1000)
  const accountJwt = await encodeAccount(
    account.name,
    accountKp,
    {
      ..._buildAccountRuleClaims(accountRule),
      revocations
    },
    { signer: operatorKp }
  )
  await NatsAccountManager.update({ id: account.id }, { jwt: accountJwt }, transaction)

  try {
    await SecretService.deleteSecretEndpoint(user.credsSecretName, transaction)
  } catch (error) {
    // best-effort secret cleanup
  }
  await NatsUserManager.delete({ id: user.id }, transaction)
  _triggerResolverArtifactsReconcile(
    account.applicationId != null ? { reason: 'account-created', applicationId: account.applicationId } : {}
  )
}

function scheduleRotateOperator () {
  _runBackgroundTask('rotate-operator', async () => {
    await module.exports.rotateOperator()
  })
  return { scheduled: true }
}

function scheduleReissueForAccountRule (accountRuleId) {
  _runBackgroundTask(`reissue-account-rule-${accountRuleId}`, async () => {
    await module.exports.reissueForAccountRule(accountRuleId)
  })
  _triggerResolverArtifactsReconcile({ reason: 'account-rule-updated', accountRuleId })
  return { scheduled: true }
}

function scheduleReissueForUserRule (userRuleId) {
  _runBackgroundTask(`reissue-user-rule-${userRuleId}`, async () => {
    await module.exports.reissueForUserRule(userRuleId)
  })
  _triggerResolverArtifactsReconcile({ reason: 'user-rule-updated', userRuleId })
  return { scheduled: true }
}

function scheduleReissueAccountsForApplications (applicationIds = []) {
  _runBackgroundTask(`reissue-accounts-${applicationIds.length}`, async () => {
    for (const applicationId of applicationIds) {
      await module.exports.reissueAccountForApplication(applicationId)
    }
  })
  return { scheduled: true }
}

function scheduleReissueUsersForMicroservices (microserviceUuids = []) {
  _runBackgroundTask(`reissue-users-${microserviceUuids.length}`, async () => {
    for (const microserviceUuid of microserviceUuids) {
      const reconcileTriggerOptions = { triggerReconcile: false }
      await module.exports.reissueUserForMicroservice(microserviceUuid, reconcileTriggerOptions)
    }
  })
  return { scheduled: true }
}

module.exports = {
  SYSTEM_ACCOUNT_NAME,
  sysUserNameForServer,
  leafSystemAccountName,
  leafSystemAccountUserName,
  ensureOperator: TransactionDecorator.generateTransaction(ensureOperator),
  rotateOperator: TransactionDecorator.generateTransaction(rotateOperator),
  ensureSystemAccount: TransactionDecorator.generateTransaction(ensureSystemAccount),
  ensureSysUserForServer: TransactionDecorator.generateTransaction(ensureSysUserForServer),
  ensureLeafSystemAccount: TransactionDecorator.generateTransaction(ensureLeafSystemAccount),
  ensureLeafSystemAccountUser: TransactionDecorator.generateTransaction(ensureLeafSystemAccountUser),
  ensureAccountForApplication: TransactionDecorator.generateTransaction(ensureAccountForApplication),
  ensureUserForMicroservice: TransactionDecorator.generateTransaction(ensureUserForMicroservice),
  createMqttBearerUser: TransactionDecorator.generateTransaction(createMqttBearerUser),
  createUserForAccount: TransactionDecorator.generateTransaction(createUserForAccount),
  ensureLeafUserForAccount: TransactionDecorator.generateTransaction(ensureLeafUserForAccount),
  ensureDefaultRules: TransactionDecorator.generateTransaction(ensureDefaultRules),
  reissueAccountForApplication: TransactionDecorator.generateTransaction(reissueAccountForApplication),
  reissueUserForMicroservice: TransactionDecorator.generateTransaction(reissueUserForMicroservice),
  reissueForAccountRule: TransactionDecorator.generateTransaction(reissueForAccountRule),
  reissueForUserRule: TransactionDecorator.generateTransaction(reissueForUserRule),
  revokeMicroserviceUser: TransactionDecorator.generateTransaction(revokeMicroserviceUser),
  revokeUserByAccountAndName: TransactionDecorator.generateTransaction(revokeUserByAccountAndName),
  deleteAccountForApplication: TransactionDecorator.generateTransaction(deleteAccountForApplication),
  getLeafSystemArtifactSecretNames: TransactionDecorator.generateTransaction(getLeafSystemArtifactSecretNames),
  deleteLeafSystemArtifactsForFog: TransactionDecorator.generateTransaction(deleteLeafSystemArtifactsForFog),
  deleteServerSysUserForFog: TransactionDecorator.generateTransaction(deleteServerSysUserForFog),
  scheduleRotateOperator,
  scheduleReissueForAccountRule,
  scheduleReissueForUserRule,
  scheduleReissueAccountsForApplications,
  scheduleReissueUsersForMicroservices
}
