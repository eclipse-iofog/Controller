/*
 *  *******************************************************************************
 *  * Copyright (c) 2023 Datasance Teknoloji A.S.
 *  *
 *  * This program and the accompanying materials are made available under the
 *  * terms of the Eclipse Public License v. 2.0 which is available at
 *  * http://www.eclipse.org/legal/epl-2.0
 *  *
 *  * SPDX-License-Identifier: EPL-2.0
 *  *******************************************************************************
 *
 */

const NatsAuthService = require('./nats-auth-service')
const NatsHubService = require('./nats-hub-service')
const NatsAccountManager = require('../data/managers/nats-account-manager')
const NatsUserManager = require('../data/managers/nats-user-manager')
const NatsAccountRuleManager = require('../data/managers/nats-account-rule-manager')
const NatsUserRuleManager = require('../data/managers/nats-user-rule-manager')
const ApplicationManager = require('../data/managers/application-manager')
const MicroserviceManager = require('../data/managers/microservice-manager')
const SecretService = require('./secret-service')
const Errors = require('../helpers/errors')
const ErrorMessages = require('../helpers/error-messages')
const AppHelper = require('../helpers/app-helper')
const Validator = require('../schemas')
const NatsSystemRules = require('../config/nats-system-rules')
const TransactionDecorator = require('../decorators/transaction-decorator')
const config = require('../config')
// const logger = require('../logger')

/**
 * Parse a byte-size limit value: integer or string with k/m/g/t suffix.
 * Examples: -1, 1024, "1k", "100m", "1g", "1t" (case-insensitive).
 * Returns integer or undefined if invalid/missing.
 */
function _parseLimitValue (val) {
  if (val === undefined || val === null) return undefined
  if (typeof val === 'number') return Number.isInteger(val) ? val : Math.floor(val)
  if (typeof val !== 'string') return undefined
  const s = String(val).trim()
  if (s === '' || s === '-1') return -1
  const match = s.match(/^(\d+)([kmgt])?$/i)
  if (!match) return undefined
  const num = parseInt(match[1], 10)
  const suffix = (match[2] || '').toLowerCase()
  const multipliers = { k: 1024, m: 1024 * 1024, g: 1024 * 1024 * 1024, t: 1024 * 1024 * 1024 * 1024 }
  return suffix ? num * multipliers[suffix] : num
}

function _normalizeRulePayload (payload, isAccountRule = false) {
  return {
    name: payload.name,
    description: payload.description,
    infoUrl: isAccountRule ? payload.infoUrl : undefined,
    maxConnections: isAccountRule ? payload.maxConnections : undefined,
    maxLeafNodeConnections: isAccountRule ? payload.maxLeafNodeConnections : undefined,
    maxData: payload.maxData !== undefined && payload.maxData !== null ? _parseLimitValue(payload.maxData) : payload.maxData,
    maxExports: isAccountRule ? payload.maxExports : undefined,
    maxImports: isAccountRule ? payload.maxImports : undefined,
    maxMsgPayload: isAccountRule && (payload.maxMsgPayload !== undefined && payload.maxMsgPayload !== null) ? _parseLimitValue(payload.maxMsgPayload) : (isAccountRule ? payload.maxMsgPayload : undefined),
    maxSubscriptions: payload.maxSubscriptions,
    exportsAllowWildcards: isAccountRule ? payload.exportsAllowWildcards : undefined,
    disallowBearer: isAccountRule ? payload.disallowBearer : undefined,
    responsePermissions: payload.responsePermissions ? JSON.stringify(payload.responsePermissions) : undefined,
    respMax: payload.respMax,
    respTtl: payload.respTtl,
    imports: isAccountRule && payload.imports != null ? (Array.isArray(payload.imports) ? JSON.stringify(payload.imports) : payload.imports) : undefined,
    exports: isAccountRule && payload.exports != null ? (Array.isArray(payload.exports) ? JSON.stringify(payload.exports) : payload.exports) : undefined,
    memStorage: isAccountRule && (payload.memStorage !== undefined && payload.memStorage !== null) ? _parseLimitValue(payload.memStorage) : (isAccountRule ? payload.memStorage : undefined),
    diskStorage: isAccountRule && (payload.diskStorage !== undefined && payload.diskStorage !== null) ? _parseLimitValue(payload.diskStorage) : (isAccountRule ? payload.diskStorage : undefined),
    streams: isAccountRule ? payload.streams : undefined,
    consumer: isAccountRule ? payload.consumer : undefined,
    maxAckPending: isAccountRule ? payload.maxAckPending : undefined,
    memMaxStreamBytes: isAccountRule && (payload.memMaxStreamBytes !== undefined && payload.memMaxStreamBytes !== null) ? _parseLimitValue(payload.memMaxStreamBytes) : (isAccountRule ? payload.memMaxStreamBytes : undefined),
    diskMaxStreamBytes: isAccountRule && (payload.diskMaxStreamBytes !== undefined && payload.diskMaxStreamBytes !== null) ? _parseLimitValue(payload.diskMaxStreamBytes) : (isAccountRule ? payload.diskMaxStreamBytes : undefined),
    maxBytesRequired: isAccountRule ? payload.maxBytesRequired : undefined,
    tieredLimits: isAccountRule && payload.tieredLimits != null ? (typeof payload.tieredLimits === 'object' ? JSON.stringify(payload.tieredLimits) : payload.tieredLimits) : undefined,
    maxPayload: !isAccountRule && (payload.maxPayload !== undefined && payload.maxPayload !== null) ? _parseLimitValue(payload.maxPayload) : (!isAccountRule ? payload.maxPayload : undefined),
    bearerToken: !isAccountRule ? payload.bearerToken : undefined,
    proxyRequired: !isAccountRule ? payload.proxyRequired : undefined,
    allowedConnectionTypes: payload.allowedConnectionTypes ? JSON.stringify(payload.allowedConnectionTypes) : undefined,
    src: !isAccountRule && payload.src != null ? (Array.isArray(payload.src) ? JSON.stringify(payload.src) : payload.src) : undefined,
    times: !isAccountRule && payload.times != null ? (Array.isArray(payload.times) ? JSON.stringify(payload.times) : payload.times) : undefined,
    timesLocation: !isAccountRule ? payload.timesLocation : undefined,
    pubAllow: payload.pubAllow ? JSON.stringify(payload.pubAllow) : undefined,
    pubDeny: payload.pubDeny ? JSON.stringify(payload.pubDeny) : undefined,
    subAllow: payload.subAllow ? JSON.stringify(payload.subAllow) : undefined,
    subDeny: payload.subDeny ? JSON.stringify(payload.subDeny) : undefined,
    tags: !isAccountRule && payload.tags != null ? (Array.isArray(payload.tags) ? JSON.stringify(payload.tags) : payload.tags) : undefined
  }
}

function _assertRuleIsMutable (name) {
  if (NatsSystemRules.isReservedRuleName(name)) {
    throw new Errors.ValidationError(`Rule ${name} is reserved and immutable`)
  }
}

function _hydrateRulePayload (rule, isAccountRule = false) {
  return {
    id: rule.id,
    name: rule.name,
    description: rule.description,
    infoUrl: isAccountRule ? rule.infoUrl : undefined,
    maxConnections: isAccountRule ? rule.maxConnections : undefined,
    maxLeafNodeConnections: isAccountRule ? rule.maxLeafNodeConnections : undefined,
    maxData: rule.maxData,
    maxExports: isAccountRule ? rule.maxExports : undefined,
    maxImports: isAccountRule ? rule.maxImports : undefined,
    maxMsgPayload: isAccountRule ? rule.maxMsgPayload : undefined,
    maxSubscriptions: rule.maxSubscriptions,
    exportsAllowWildcards: isAccountRule ? rule.exportsAllowWildcards : undefined,
    disallowBearer: isAccountRule ? rule.disallowBearer : undefined,
    responsePermissions: rule.responsePermissions ? JSON.parse(rule.responsePermissions) : undefined,
    respMax: rule.respMax,
    respTtl: rule.respTtl,
    imports: isAccountRule && rule.imports != null ? (typeof rule.imports === 'string' ? JSON.parse(rule.imports) : rule.imports) : undefined,
    exports: isAccountRule && rule.exports != null ? (typeof rule.exports === 'string' ? JSON.parse(rule.exports) : rule.exports) : undefined,
    memStorage: isAccountRule ? rule.memStorage : undefined,
    diskStorage: isAccountRule ? rule.diskStorage : undefined,
    streams: isAccountRule ? rule.streams : undefined,
    consumer: isAccountRule ? rule.consumer : undefined,
    maxAckPending: isAccountRule ? rule.maxAckPending : undefined,
    memMaxStreamBytes: isAccountRule ? rule.memMaxStreamBytes : undefined,
    diskMaxStreamBytes: isAccountRule ? rule.diskMaxStreamBytes : undefined,
    maxBytesRequired: isAccountRule ? rule.maxBytesRequired : undefined,
    tieredLimits: isAccountRule && rule.tieredLimits != null ? (typeof rule.tieredLimits === 'string' ? JSON.parse(rule.tieredLimits) : rule.tieredLimits) : undefined,
    maxPayload: !isAccountRule ? rule.maxPayload : undefined,
    bearerToken: !isAccountRule ? rule.bearerToken : undefined,
    proxyRequired: !isAccountRule ? rule.proxyRequired : undefined,
    allowedConnectionTypes: rule.allowedConnectionTypes ? JSON.parse(rule.allowedConnectionTypes) : undefined,
    src: !isAccountRule && rule.src != null ? (typeof rule.src === 'string' ? JSON.parse(rule.src) : rule.src) : undefined,
    times: !isAccountRule && rule.times != null ? (typeof rule.times === 'string' ? JSON.parse(rule.times) : rule.times) : undefined,
    timesLocation: !isAccountRule ? rule.timesLocation : undefined,
    pubAllow: rule.pubAllow ? JSON.parse(rule.pubAllow) : undefined,
    pubDeny: rule.pubDeny ? JSON.parse(rule.pubDeny) : undefined,
    subAllow: rule.subAllow ? JSON.parse(rule.subAllow) : undefined,
    subDeny: rule.subDeny ? JSON.parse(rule.subDeny) : undefined,
    tags: !isAccountRule && rule.tags != null ? (typeof rule.tags === 'string' ? JSON.parse(rule.tags) : rule.tags) : undefined
  }
}

async function listAccounts (transaction) {
  const accounts = await NatsAccountManager.findAll({}, transaction)
  return {
    accounts: accounts.map(account => ({
      id: account.id,
      name: account.name,
      publicKey: account.publicKey,
      jwt: account.jwt,
      isSystem: account.isSystem,
      isLeafSystem: account.isLeafSystem,
      applicationId: account.applicationId
    }))
  }
}

async function getOperator (transaction) {
  const operator = await NatsAuthService.ensureOperator(transaction)
  return {
    name: operator.name,
    publicKey: operator.publicKey,
    jwt: operator.jwt
  }
}

function _isKubernetesControlPlane () {
  const controlPlane = process.env.CONTROL_PLANE || config.get('app.ControlPlane')
  return controlPlane && String(controlPlane).toLowerCase() === 'kubernetes'
}

async function getBootstrap (transaction) {
  if (!_isKubernetesControlPlane()) {
    throw new Errors.ForbiddenError('NATS bootstrap is only available when the Controller runs on the Kubernetes control plane')
  }
  const operator = await NatsAuthService.ensureOperator(transaction, { triggerReconcile: false })
  const seedSecret = await SecretService.getSecretEndpoint(operator.seedSecretName, transaction)
  if (!seedSecret || !seedSecret.data || !seedSecret.data.seed) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.SECRET_NOT_FOUND, operator.seedSecretName))
  }
  const operatorSeed = typeof seedSecret.data.seed === 'string'
    ? seedSecret.data.seed
    : Buffer.from(seedSecret.data.seed).toString('utf8')

  const { account: systemAccount, user } = await NatsAuthService.ensureSysUserForServer({ isHub: true }, transaction)
  const credsSecret = await SecretService.getSecretEndpoint(user.credsSecretName, transaction)
  if (!credsSecret || !credsSecret.data) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.SECRET_NOT_FOUND, user.credsSecretName))
  }
  const credsKey = Object.keys(credsSecret.data).find((key) => key.endsWith('.creds')) || 'creds'
  const raw = credsSecret.data[credsKey]
  if (!raw) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.SECRET_NOT_FOUND, user.credsSecretName))
  }
  const sysUserCredsBase64 = typeof raw === 'string'
    ? Buffer.from(raw, 'utf8').toString('base64')
    : Buffer.from(raw).toString('base64')

  return {
    operatorJwt: operator.jwt,
    operatorPublicKey: operator.publicKey,
    operatorSeed,
    systemAccountJwt: systemAccount.jwt,
    systemAccountPublicKey: systemAccount.publicKey,
    sysUserCredsBase64
  }
}

async function rotateOperator (transaction) {
  const operator = await NatsAuthService.ensureOperator(transaction)
  NatsAuthService.scheduleRotateOperator()
  return {
    name: operator.name,
    publicKey: operator.publicKey,
    jwt: operator.jwt
  }
}

async function getHub (transaction) {
  return NatsHubService.getDefaultHub(transaction)
}

async function upsertHub (payload, transaction) {
  const hub = await NatsHubService.upsertDefaultHub(payload || {}, transaction)
  return {
    host: hub.host,
    serverPort: hub.serverPort,
    clusterPort: hub.clusterPort,
    leafPort: hub.leafPort,
    mqttPort: hub.mqttPort,
    httpPort: hub.httpPort
  }
}

async function getAccount (appName, transaction) {
  const application = await ApplicationManager.findOne({ name: appName }, transaction)
  if (!application) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_FLOW_NAME, appName))
  }
  const account = await NatsAccountManager.findOne({ applicationId: application.id }, transaction)
  if (!account) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_FLOW_ID, application.id))
  }
  return {
    id: account.id,
    name: account.name,
    publicKey: account.publicKey,
    jwt: account.jwt,
    isSystem: account.isSystem,
    applicationId: account.applicationId
  }
}

async function ensureAccount (appName, payload, transaction) {
  const application = await ApplicationManager.findOne({ name: appName }, transaction)
  if (!application) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_FLOW_NAME, appName))
  }
  if (application.natsAccess) {
    throw new Errors.ValidationError(
      'Application already has NATS account enabled. Update application natsConfig (natsAccess/natsRule) to change.'
    )
  }
  const ruleName = (payload && payload.natsRule) || NatsSystemRules.APPLICATION_ACCOUNT_RULE_NAME
  const rule = await NatsAccountRuleManager.findOne({ name: ruleName }, transaction)
  if (!rule) {
    throw new Errors.ValidationError(`NATS account rule '${ruleName}' not found`)
  }
  const account = await NatsAuthService.ensureAccountForApplication(application.id, transaction)
  await ApplicationManager.update({ id: application.id }, {
    natsAccess: true,
    natsRuleId: rule.id
  }, transaction)
  return {
    id: account.id,
    name: account.name,
    publicKey: account.publicKey,
    jwt: account.jwt,
    isSystem: account.isSystem,
    applicationId: account.applicationId
  }
}

async function listAllUsers (transaction) {
  const users = await NatsUserManager.findAllWithAccountAndApplication(transaction)
  return {
    users: users.map(user => ({
      id: user.id,
      name: user.name,
      publicKey: user.publicKey,
      jwt: user.jwt,
      isBearer: user.isBearer,
      accountId: user.accountId,
      accountName: user.account ? user.account.name : null,
      applicationId: user.account && user.account.application ? user.account.application.id : null,
      applicationName: user.account && user.account.application ? user.account.application.name : null,
      microserviceUuid: user.microserviceUuid
    }))
  }
}

async function listUsers (appName, transaction) {
  const application = await ApplicationManager.findOne({ name: appName }, transaction)
  if (!application) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_FLOW_NAME, appName))
  }
  const account = await NatsAccountManager.findOne({ applicationId: application.id }, transaction)
  if (!account) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_FLOW_ID, application.id))
  }
  const users = await NatsUserManager.findAll({ accountId: account.id }, transaction)
  return {
    users: users.map(user => ({
      id: user.id,
      name: user.name,
      publicKey: user.publicKey,
      jwt: user.jwt,
      isBearer: user.isBearer,
      microserviceUuid: user.microserviceUuid
    }))
  }
}

async function createUser (appName, payload, transaction) {
  await Validator.validate(payload || {}, Validator.schemas.natsUserCreate)
  const userName = payload && payload.name
  if (!userName) {
    throw new Errors.ValidationError('User name is required')
  }
  const application = await ApplicationManager.findOne({ name: appName }, transaction)
  if (!application) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_FLOW_NAME, appName))
  }
  const account = await NatsAuthService.ensureAccountForApplication(application.id, transaction)
  const expiresIn = payload && payload.expiresIn
  const natsRule = payload && payload.natsRule
  const { user } = await NatsAuthService.createUserForAccount(account.id, userName, expiresIn, natsRule, null, transaction)
  return {
    id: user.id,
    name: user.name,
    publicKey: user.publicKey,
    jwt: user.jwt,
    isBearer: user.isBearer
  }
}

async function getUserCreds (appName, userName, transaction) {
  const application = await ApplicationManager.findOne({ name: appName }, transaction)
  const sysAccount = await NatsAccountManager.findOne({ name: appName }, transaction)

  if (!application && (!sysAccount || (!sysAccount.isSystem && !sysAccount.isLeafSystem))) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_FLOW_NAME, appName))
  }
  let accountId = null
  if (application) {
    const account = await NatsAccountManager.findOne({ applicationId: application.id }, transaction)
    if (!account) {
      throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_FLOW_ID, application.id))
    }
    accountId = account.id
  }
  if (sysAccount && (sysAccount.isSystem || sysAccount.isLeafSystem)) {
    accountId = sysAccount.id
  }
  const user = await NatsUserManager.findOne({ accountId: accountId, name: userName }, transaction)
  if (!user) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_MICROSERVICE_NAME, userName))
  }
  const secret = await SecretService.getSecretEndpoint(user.credsSecretName, transaction)
  if (!secret || !secret.data) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.SECRET_NOT_FOUND, user.credsSecretName))
  }
  const credsKey = Object.keys(secret.data).find((key) => key.endsWith('.creds')) || 'creds'
  const raw = secret.data[credsKey]
  if (!raw) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.SECRET_NOT_FOUND, user.credsSecretName))
  }
  const credsBase64 = typeof raw === 'string'
    ? Buffer.from(raw, 'utf8').toString('base64')
    : Buffer.from(raw).toString('base64')
  return {
    credsBase64
  }
}

async function createMqttBearer (appName, payload, transaction) {
  await Validator.validate(payload || {}, Validator.schemas.natsUserCreate)
  const userName = payload && payload.name
  if (!userName) {
    throw new Errors.ValidationError('User name is required')
  }
  const application = await ApplicationManager.findOne({ name: appName }, transaction)
  if (!application) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_FLOW_NAME, appName))
  }
  const expiresIn = payload && payload.expiresIn
  const natsRule = payload && payload.natsRule
  const { user, bearerJwt } = await NatsAuthService.createMqttBearerUser(application.id, userName, expiresIn, natsRule, transaction)
  return {
    id: user.id,
    name: user.name,
    publicKey: user.publicKey,
    jwt: bearerJwt
  }
}

async function deleteUser (appName, userName, transaction) {
  const application = await ApplicationManager.findOne({ name: appName }, transaction)
  if (!application) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_FLOW_NAME, appName))
  }
  const account = await NatsAccountManager.findOne({ applicationId: application.id }, transaction)
  if (!account) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_FLOW_ID, application.id))
  }
  await NatsAuthService.revokeUserByAccountAndName(account.id, userName, transaction)
}

async function deleteMqttBearer (appName, userName, transaction) {
  const application = await ApplicationManager.findOne({ name: appName }, transaction)
  if (!application) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_FLOW_NAME, appName))
  }
  const account = await NatsAccountManager.findOne({ applicationId: application.id }, transaction)
  if (!account) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_FLOW_ID, application.id))
  }
  const user = await NatsUserManager.findOne({ accountId: account.id, name: userName }, transaction)
  if (!user) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_MICROSERVICE_NAME, userName))
  }
  if (!user.isBearer) {
    throw new Errors.ValidationError('User is not an MQTT bearer user. Use account user delete endpoint instead.')
  }
  await NatsAuthService.revokeUserByAccountAndName(account.id, userName, transaction)
}

async function listAccountRules (transaction) {
  await NatsAuthService.ensureDefaultRules(transaction)
  const rules = await NatsAccountRuleManager.findAll({}, transaction)
  const systemRuleNames = new Set(NatsSystemRules.getSystemAccountRuleDefinitions().map((rule) => rule.name))
  const customRules = rules.filter((rule) => !systemRuleNames.has(rule.name))
  const systemRules = await Promise.all(
    NatsSystemRules.getSystemAccountRuleDefinitions().map(async (rule) => {
      const persisted = await NatsAccountRuleManager.findOne({ name: rule.name }, transaction)
      return _hydrateRulePayload(persisted || rule, true)
    })
  )
  return {
    rules: [
      ...systemRules.map((rule) => ({ ...rule, isSystem: true })),
      ...customRules.map((rule) => ({ ..._hydrateRulePayload(rule, true), isSystem: false }))
    ]
  }
}

async function createAccountRule (payload, transaction) {
  await Validator.validate(payload || {}, Validator.schemas.natsAccountRulePayload)
  if (!payload || !payload.name) {
    throw new Errors.ValidationError('name is required')
  }
  _assertRuleIsMutable(payload.name)
  const existing = await NatsAccountRuleManager.findOne({ name: payload.name }, transaction)
  if (existing) {
    throw new Errors.ValidationError(`NATS account rule ${payload.name} already exists`)
  }
  const created = await NatsAccountRuleManager.create(_normalizeRulePayload(payload, true), transaction)
  return _hydrateRulePayload(created, true)
}

async function updateAccountRule (ruleName, payload, transaction) {
  await Validator.validate(payload || {}, Validator.schemas.natsAccountRulePayload)
  _assertRuleIsMutable(ruleName)
  const rule = await NatsAccountRuleManager.findOne({ name: ruleName }, transaction)
  if (!rule) {
    throw new Errors.NotFoundError(`NATS account rule ${ruleName} not found`)
  }
  const normalizedPayload = _normalizeRulePayload(payload, true)
  delete normalizedPayload.name
  await NatsAccountRuleManager.update({ id: rule.id }, normalizedPayload, transaction)
  NatsAuthService.scheduleReissueForAccountRule(rule.id)
  const updated = await NatsAccountRuleManager.findOne({ id: rule.id }, transaction)
  return _hydrateRulePayload(updated, true)
}

async function deleteAccountRule (ruleName, transaction) {
  _assertRuleIsMutable(ruleName)
  const rule = await NatsAccountRuleManager.findOne({ name: ruleName }, transaction)
  if (!rule) {
    throw new Errors.NotFoundError(`NATS account rule ${ruleName} not found`)
  }

  const affectedApps = await ApplicationManager.findAll({ natsRuleId: rule.id }, transaction)
  if (affectedApps.length > 0) {
    throw new Errors.ValidationError(
      'Cannot delete NATS account rule that is attached to one or more applications. Detach or change the rule on each application first.'
    )
  }
  await NatsAccountRuleManager.delete({ id: rule.id }, transaction)
}

async function listUserRules (transaction) {
  await NatsAuthService.ensureDefaultRules(transaction)
  const rules = await NatsUserRuleManager.findAll({}, transaction)
  const systemRuleNames = new Set(NatsSystemRules.getSystemUserRuleDefinitions().map((rule) => rule.name))
  const customRules = rules.filter((rule) => !systemRuleNames.has(rule.name))
  const systemRules = await Promise.all(
    NatsSystemRules.getSystemUserRuleDefinitions().map(async (rule) => {
      const persisted = await NatsUserRuleManager.findOne({ name: rule.name }, transaction)
      return _hydrateRulePayload(persisted || rule, false)
    })
  )
  return {
    rules: [
      ...systemRules.map((rule) => ({ ...rule, isSystem: true })),
      ...customRules.map((rule) => ({ ..._hydrateRulePayload(rule, false), isSystem: false }))
    ]
  }
}

async function createUserRule (payload, transaction) {
  await Validator.validate(payload || {}, Validator.schemas.natsUserRulePayload)
  if (!payload || !payload.name) {
    throw new Errors.ValidationError('name is required')
  }
  _assertRuleIsMutable(payload.name)
  const existing = await NatsUserRuleManager.findOne({ name: payload.name }, transaction)
  if (existing) {
    throw new Errors.ValidationError(`NATS user rule ${payload.name} already exists`)
  }
  const created = await NatsUserRuleManager.create(_normalizeRulePayload(payload, false), transaction)
  return _hydrateRulePayload(created, false)
}

async function updateUserRule (ruleName, payload, transaction) {
  await Validator.validate(payload || {}, Validator.schemas.natsUserRulePayload)
  _assertRuleIsMutable(ruleName)
  const rule = await NatsUserRuleManager.findOne({ name: ruleName }, transaction)
  if (!rule) {
    throw new Errors.NotFoundError(`NATS user rule ${ruleName} not found`)
  }
  const normalizedPayload = _normalizeRulePayload(payload, false)
  delete normalizedPayload.name
  await NatsUserRuleManager.update({ id: rule.id }, normalizedPayload, transaction)
  NatsAuthService.scheduleReissueForUserRule(rule.id)
  const updated = await NatsUserRuleManager.findOne({ id: rule.id }, transaction)
  return _hydrateRulePayload(updated, false)
}

async function deleteUserRule (ruleName, transaction) {
  _assertRuleIsMutable(ruleName)
  const rule = await NatsUserRuleManager.findOne({ name: ruleName }, transaction)
  if (!rule) {
    throw new Errors.NotFoundError(`NATS user rule ${ruleName} not found`)
  }

  const affectedMicroservices = await MicroserviceManager.findAll({ natsRuleId: rule.id }, transaction)
  if (affectedMicroservices.length > 0) {
    throw new Errors.ValidationError(
      'Cannot delete NATS user rule that is attached to one or more users/microservices. Detach or change the rule on each microservice first.'
    )
  }
  await NatsUserRuleManager.delete({ id: rule.id }, transaction)
}

const bypassOptions = { bypassQueue: true }

module.exports = {
  getOperator: TransactionDecorator.generateTransaction(getOperator, bypassOptions),
  rotateOperator: TransactionDecorator.generateTransaction(rotateOperator, bypassOptions),
  getBootstrap: TransactionDecorator.generateTransaction(getBootstrap, bypassOptions),
  getHub: TransactionDecorator.generateTransaction(getHub, bypassOptions),
  upsertHub: TransactionDecorator.generateTransaction(upsertHub, bypassOptions),
  listAccounts: TransactionDecorator.generateTransaction(listAccounts),
  getAccount: TransactionDecorator.generateTransaction(getAccount),
  ensureAccount: TransactionDecorator.generateTransaction(ensureAccount, bypassOptions),
  listAllUsers: TransactionDecorator.generateTransaction(listAllUsers),
  listUsers: TransactionDecorator.generateTransaction(listUsers),
  createUser: TransactionDecorator.generateTransaction(createUser, bypassOptions),
  getUserCreds: TransactionDecorator.generateTransaction(getUserCreds),
  deleteUser: TransactionDecorator.generateTransaction(deleteUser, bypassOptions),
  createMqttBearer: TransactionDecorator.generateTransaction(createMqttBearer, bypassOptions),
  deleteMqttBearer: TransactionDecorator.generateTransaction(deleteMqttBearer, bypassOptions),
  listAccountRules: TransactionDecorator.generateTransaction(listAccountRules),
  createAccountRule: TransactionDecorator.generateTransaction(createAccountRule, bypassOptions),
  updateAccountRule: TransactionDecorator.generateTransaction(updateAccountRule, bypassOptions),
  deleteAccountRule: TransactionDecorator.generateTransaction(deleteAccountRule, bypassOptions),
  listUserRules: TransactionDecorator.generateTransaction(listUserRules),
  createUserRule: TransactionDecorator.generateTransaction(createUserRule, bypassOptions),
  updateUserRule: TransactionDecorator.generateTransaction(updateUserRule, bypassOptions),
  deleteUserRule: TransactionDecorator.generateTransaction(deleteUserRule, bypassOptions)
}
