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

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const AppHelper = require('../helpers/app-helper')
const Errors = require('../helpers/errors')
const ErrorMessages = require('../helpers/error-messages')
const ConfigMapManager = require('../data/managers/config-map-manager')
const ConfigMapService = require('./config-map-service')
const VolumeMappingManager = require('../data/managers/volume-mapping-manager')
const MicroserviceManager = require('../data/managers/microservice-manager')
const MicroserviceCapAddManager = require('../data/managers/microservice-cap-add-manager')
const MicroserviceEnvManager = require('../data/managers/microservice-env-manager')
const MicroserviceHealthCheckManager = require('../data/managers/microservice-healthcheck-manager')
const MicroserviceStatusManager = require('../data/managers/microservice-status-manager')
const MicroserviceExecStatusManager = require('../data/managers/microservice-exec-status-manager')
const MicroservicePortManager = require('../data/managers/microservice-port-manager')
const VolumeMountService = require('./volume-mount-service')
const CatalogService = require('./catalog-service')
const CertificateService = require('./certificate-service')
const SecretService = require('./secret-service')
const NatsInstanceManager = require('../data/managers/nats-instance-manager')
const NatsConnectionManager = require('../data/managers/nats-connection-manager')
const NatsAccountManager = require('../data/managers/nats-account-manager')
const NatsReconcileTaskManager = require('../data/managers/nats-reconcile-task-manager')
const NatsUserManager = require('../data/managers/nats-user-manager')
const ApplicationManager = require('../data/managers/application-manager')
const NatsAuthService = require('./nats-auth-service')
const ChangeTrackingService = require('./change-tracking-service')
const FogManager = require('../data/managers/iofog-manager')
const databaseProvider = require('../data/providers/database-factory')
const config = require('../config')
const Constants = require('../helpers/constants')
const { ensureSystemApplication, getSystemMicroserviceName, slugifyName } = require('../helpers/system-naming')
const TransactionDecorator = require('../decorators/transaction-decorator')
const logger = require('../logger')
const K8sClient = require('../utils/k8s-client')
const { Op } = require('sequelize')

const NATS_SITE_CA = 'nats-site-ca'
const NATS_CONFIG_DIR = '/etc/nats/config'
const NATS_JWT_DIR = '/home/runner/nats/jwt'
const NATS_JWT_MOUNT_DIR = '/tmp/nats/jwt'
const NATS_CERTS_DIR = '/etc/nats/certs'
const NATS_CREDS_DIR = '/etc/nats/creds'

const DEFAULT_SERVER_PORT = 4222
const DEFAULT_CLUSTER_PORT = 6222
const DEFAULT_LEAF_PORT = 7422
const DEFAULT_MQTT_PORT = 8883
const DEFAULT_HTTP_PORT = 8222
let natsReconcileRunning = false
let natsReconcilePending = false
let natsReconcileScheduled = false

const _fogToken = (fog) => slugifyName((fog && fog.name) || (fog && fog.uuid) || 'fog')
const natsLocalCaName = (fog) => `nats-local-ca-${_fogToken(fog)}`
const natsLocalMQTTCertName = (fog) => `nats-mqtt-server-${_fogToken(fog)}`
const natsServerCertName = (fog) => `nats-server-${_fogToken(fog)}`
const natsServerConfigMap = (fog) => `nats-server-conf-${_fogToken(fog)}`
const natsLeafConfigMap = (fog) => `nats-leaf-conf-${_fogToken(fog)}`
const natsConfigMapName = (fog) => `nats-server-conf-${_fogToken(fog)}`
const NATS_CONFIG_KEY = 'server.conf'
const natsLeafCredsConfigMap = (fog) => `nats-leaf-creds-${_fogToken(fog)}`
const natsJwtBundleConfigMap = (fog) => `nats-jwt-bundle-${_fogToken(fog)}`
const natsJwtDirMount = (fog) => `nats-jwt-dir-${_fogToken(fog)}`
const natsJetstreamKeySecretName = (fog) => `nats-jetstream-key-${_fogToken(fog)}`
const K8S_NATS_SERVER_CONFIG_MAP = 'iofog-nats-config'
const K8S_NATS_JWT_BUNDLE_CONFIG_MAP = 'iofog-nats-jwt-bundle'

async function _getSysUserCredsSecretNameForFog (fog, isHub, transaction) {
  const systemAccount = await NatsAccountManager.findOne({ isSystem: true }, transaction)
  if (!systemAccount) return null
  const sysUserName = NatsAuthService.sysUserNameForServer(isHub, fog)
  const user = await NatsUserManager.findOne({ accountId: systemAccount.id, name: sysUserName }, transaction)
  return user ? user.credsSecretName : null
}

function _isKubernetesControlPlane () {
  const controlPlane = process.env.CONTROL_PLANE || config.get('app.ControlPlane')
  return controlPlane && String(controlPlane).toLowerCase() === 'kubernetes'
}

const JETSTREAM_SIZE_PATTERN = /^(\d+)\s*(m|mb|g|gb|t|tb)?$/i
const DEFAULT_JS_STORAGE_SIZE = '10g'
const DEFAULT_JS_MEMORY_STORE_SIZE = '1g'

function _normalizeJetstreamSize (value, defaultValue) {
  if (value === undefined || value === null || String(value).trim() === '') {
    return defaultValue
  }
  const s = String(value).trim()
  const match = s.match(JETSTREAM_SIZE_PATTERN)
  if (!match) {
    throw new Errors.ValidationError(`Invalid JetStream size: ${value}. Use a number with optional unit: m, mb, g, gb, t, tb (case-insensitive).`)
  }
  const num = match[1]
  const unit = (match[2] || 'g').toLowerCase()
  return `${num}${unit}`
}

const readTemplate = (fileName) => {
  const filePath = path.join(__dirname, '..', 'templates', 'nats', fileName)
  return fs.readFileSync(filePath, 'utf8')
}

const renderTemplate = (template, variables) => {
  return Object.entries(variables).reduce((output, [key, value]) => {
    if (value === undefined || value === null) {
      return output
    }
    return output.split(`$${key}`).join(String(value))
  }, template)
}

/**
 * Escapes double quotes in s for use inside a double-quoted NATS config value.
 * Caller must wrap the result in quotes in the template (e.g. key: "$JETSTREAM_KEY")
 * so values that look like numbers (e.g. base64) or contain special chars parse as strings.
 */
function _escapeConfString (s) {
  if (s == null) return ''
  return String(s).replace(/"/g, '\\"')
}

/**
 * Deterministic hash of ConfigMap-style data object (key-order independent).
 * Used to skip ConfigMap update when content is unchanged.
 */
function _configMapDataHash (data) {
  if (data == null || typeof data !== 'object') {
    return crypto.createHash('sha256').update(String(data)).digest('hex')
  }
  const sortedKeys = Object.keys(data).sort()
  const canonical = JSON.stringify(sortedKeys.map(k => ({ k, v: data[k] })))
  return crypto.createHash('sha256').update(canonical).digest('hex')
}

async function _ensureConfigMap (name, data, transaction) {
  const existing = await ConfigMapManager.getConfigMap(name, transaction)
  if (existing) {
    const existingHash = _configMapDataHash(existing.data)
    const newHash = _configMapDataHash(data)
    if (existingHash === newHash) {
      return
    }
    return ConfigMapService.updateConfigMapEndpoint(name, { data, immutable: false }, transaction)
  }
  return ConfigMapService.createConfigMapEndpoint({ name, data, immutable: false, useVault: true }, transaction)
}

async function _ensureVolumeMount (name, opts, transaction) {
  try {
    await VolumeMountService.getVolumeMountEndpoint(name, transaction)
  } catch (err) {
    if (err.name !== 'NotFoundError') {
      throw err
    }
    await VolumeMountService.createVolumeMountEndpoint({ name, ...opts }, transaction)
  }
}

async function _ensureVolumeMapping (microserviceUuid, hostDestination, containerDestination, accessMode, type, transaction) {
  const existing = await VolumeMappingManager.findOne({
    microserviceUuid,
    hostDestination,
    containerDestination,
    type
  }, transaction)
  if (!existing) {
    await VolumeMappingManager.create({
      microserviceUuid,
      hostDestination,
      containerDestination,
      accessMode,
      type
    }, transaction)
    return true
  }
  return false
}

async function _replaceMicroserviceEnv (microserviceUuid, env, transaction) {
  await MicroserviceEnvManager.delete({ microserviceUuid }, transaction)
  for (const entry of env) {
    await MicroserviceEnvManager.create({
      microserviceUuid,
      key: entry.key,
      value: entry.value,
      valueFromSecret: entry.valueFromSecret,
      valueFromConfigMap: entry.valueFromConfigMap
    }, transaction)
  }
}

function _normalizePortSet (ports) {
  const set = new Set([].concat(ports).map(p => Number(p)).filter(p => !Number.isNaN(p)))
  return [...set].sort((a, b) => a - b)
}

async function _ensureNatsPorts (microserviceUuid, ports, transaction, iofogUuid) {
  const desired = _normalizePortSet(ports)
  const existing = await MicroservicePortManager.findAll({ microserviceUuid }, transaction)
  const current = _normalizePortSet((existing || []).map(p => p.portInternal != null ? p.portInternal : p.portExternal))
  const same = desired.length === current.length && desired.every((p, i) => p === current[i])
  if (same) {
    return
  }
  for (const port of existing) {
    await MicroservicePortManager.delete({ id: port.id }, transaction)
  }
  for (const port of desired) {
    await MicroservicePortManager.create({
      microserviceUuid,
      portInternal: port,
      portExternal: port
    }, transaction)
  }
  if (iofogUuid) {
    await ChangeTrackingService.update(iofogUuid, ChangeTrackingService.events.microserviceList, transaction)
  }
}

async function _ensureNatsCertificates (fog, transaction) {
  async function ensureCA (name, subject) {
    try {
      await CertificateService.getCAEndpoint(name, transaction)
    } catch (err) {
      if (err.name !== 'NotFoundError') {
        throw err
      }
      await CertificateService.createCAEndpoint({
        name,
        subject: subject,
        expiration: 60,
        type: 'self-signed'
      }, transaction)
    }
  }

  async function ensureCert (name, subject, hosts, caName) {
    try {
      await CertificateService.getCertificateEndpoint(name, transaction)
    } catch (err) {
      if (err.name !== 'NotFoundError') {
        throw err
      }
      await CertificateService.createCertificateEndpoint({
        name,
        subject: subject,
        hosts: hosts.join(','),
        ca: {
          type: 'direct',
          secretName: caName
        },
        expiration: 60
      }, transaction)
    }
  }

  await ensureCA(NATS_SITE_CA, NATS_SITE_CA)
  await ensureCA(natsLocalCaName(fog), natsLocalCaName(fog))

  const hosts = [fog.host, fog.ipAddress, fog.ipAddressExternal].filter(Boolean)
  if (hosts.length === 0) {
    hosts.push('localhost')
  }
  const serverCertName = natsServerCertName(fog)
  const mqttCertName = natsLocalMQTTCertName(fog)

  await ensureCert(serverCertName, serverCertName, hosts, NATS_SITE_CA)
  await ensureCert(mqttCertName, mqttCertName, hosts, natsLocalCaName(fog))

  return {
    serverCertName,
    mqttCertName
  }
}

async function _buildJwtBundle (fog, forLeaf = false, transaction) {
  const jwtBundle = {}
  if (forLeaf) {
    const leafSystemAccount = await NatsAuthService.ensureLeafSystemAccount(fog, transaction)
    jwtBundle[`${leafSystemAccount.publicKey}.jwt`] = leafSystemAccount.jwt
    const appIds = await _getLeafAppIds(fog, transaction)
    for (const appId of appIds) {
      const account = await NatsAuthService.ensureAccountForApplication(appId, transaction)
      jwtBundle[`${account.publicKey}.jwt`] = account.jwt
    }
  } else {
    await NatsAuthService.ensureSystemAccount(transaction)
    const systemAccount = await NatsAccountManager.findOne({ isSystem: true }, transaction)
    if (systemAccount) {
      jwtBundle[`${systemAccount.publicKey}.jwt`] = systemAccount.jwt
    }
    const microservices = await MicroserviceManager.findAll({ iofogUuid: fog.uuid }, transaction)
    const appIds = [...new Set(microservices.map(ms => ms.applicationId).filter(Boolean))]
    for (const appId of appIds) {
      const app = await ApplicationManager.findOne({ id: appId }, transaction)
      if (!app || !app.natsAccess) continue
      const account = await NatsAuthService.ensureAccountForApplication(appId, transaction)
      jwtBundle[`${account.publicKey}.jwt`] = account.jwt
    }
  }
  return jwtBundle
}

async function _buildHubJwtBundle (transaction) {
  const jwtBundle = {}
  await NatsAuthService.ensureSystemAccount(transaction)
  const systemAccount = await NatsAccountManager.findOne({ isSystem: true }, transaction)
  if (systemAccount) {
    jwtBundle[`${systemAccount.publicKey}.jwt`] = systemAccount.jwt
  }
  const applicationsWithNats = await ApplicationManager.findAll({ natsAccess: true }, transaction)
  for (const app of applicationsWithNats || []) {
    const account = await NatsAccountManager.findOne({ applicationId: app.id }, transaction)
    if (account) {
      jwtBundle[`${account.publicKey}.jwt`] = account.jwt
    }
  }
  return jwtBundle
}

async function _getLeafAppIds (fog, transaction) {
  const microservices = await MicroserviceManager.findAll({ iofogUuid: fog.uuid }, transaction)
  const appIds = [...new Set(microservices.map(ms => ms.applicationId).filter(Boolean))]
  const nonSystemAppIds = []
  for (const appId of appIds) {
    const app = await ApplicationManager.findOne({ id: appId }, transaction)
    if (app && !app.isSystem && app.natsAccess) {
      nonSystemAppIds.push(appId)
    }
  }
  return nonSystemAppIds
}

/**
 * Build JWT bundle for a fog using preloaded maps (used inside reconcile to avoid per-fog DB).
 * @param {object} fog
 * @param {boolean} forLeaf
 * @param {{ applicationsWithNatsById: Map, accountByAppId: Map, systemAccount: object|null, microservicesByFog: Map }} maps
 * @param {object} transaction
 */
async function _buildJwtBundleFromMaps (fog, forLeaf, maps, transaction) {
  const { applicationsWithNatsById, accountByAppId, systemAccount, microservicesByFog } = maps
  const jwtBundle = {}
  const fogMicroservices = microservicesByFog.get(fog.uuid) || []
  const appIds = [...new Set(fogMicroservices.map(ms => ms.applicationId).filter(Boolean))]

  if (forLeaf) {
    const leafSystemAccount = await NatsAuthService.ensureLeafSystemAccount(fog, transaction)
    jwtBundle[`${leafSystemAccount.publicKey}.jwt`] = leafSystemAccount.jwt
    for (const appId of appIds) {
      const app = applicationsWithNatsById.get(appId)
      if (!app || app.isSystem || !app.natsAccess) continue
      let account = accountByAppId.get(appId)
      if (!account) {
        account = await NatsAuthService.ensureAccountForApplication(appId, transaction)
      }
      jwtBundle[`${account.publicKey}.jwt`] = account.jwt
    }
  } else {
    await NatsAuthService.ensureSystemAccount(transaction)
    const sysAccount = systemAccount || await NatsAccountManager.findOne({ isSystem: true }, transaction)
    if (sysAccount) {
      jwtBundle[`${sysAccount.publicKey}.jwt`] = sysAccount.jwt
    }
    for (const appId of appIds) {
      const app = applicationsWithNatsById.get(appId)
      if (!app || !app.natsAccess) continue
      let account = accountByAppId.get(appId)
      if (!account) {
        account = await NatsAuthService.ensureAccountForApplication(appId, transaction)
      }
      jwtBundle[`${account.publicKey}.jwt`] = account.jwt
    }
  }
  return jwtBundle
}

async function _buildLeafCredsConfigMap (fog, natsInstance, transaction) {
  const upstreamConnections = await NatsConnectionManager.findAllWithNats(
    { sourceNats: natsInstance.id },
    transaction
  )
  if (!upstreamConnections || upstreamConnections.length === 0) {
    return
  }

  const appIds = await _getLeafAppIds(fog, transaction)
  const credsData = {}
  for (const appId of appIds) {
    const account = await NatsAuthService.ensureAccountForApplication(appId, transaction)
    const { user } = await NatsAuthService.ensureLeafUserForAccount(account.id, slugifyName(fog.name), transaction, fog.natsMicroserviceUuid || null)
    try {
      const secret = await SecretService.getSecretEndpoint(user.credsSecretName, transaction)
      if (secret && secret.data) {
        const credsKey = Object.keys(secret.data).find((k) => k.endsWith('.creds')) || `${slugifyName(account.name)}/${slugifyName(user.name)}.creds`
        const content = secret.data[credsKey]
        if (content) {
          const value = typeof content === 'string' ? content : Buffer.from(content, 'base64').toString('utf8')
          credsData[`${slugifyName(account.name)}/${slugifyName(user.name)}.creds`] = value
        }
      }
    } catch (err) {
      if (err.name !== 'NotFoundError') {
        throw err
      }
    }
  }

  const { account: leafSystemAccount, user: leafSystemUser } = await NatsAuthService.ensureLeafSystemAccountUser(fog, transaction)
  try {
    const secret = await SecretService.getSecretEndpoint(leafSystemUser.credsSecretName, transaction)
    if (secret && secret.data) {
      const credsKey = `${slugifyName(leafSystemAccount.name)}/${slugifyName(leafSystemUser.name)}.creds`
      const content = secret.data[credsKey]
      if (content) {
        const value = typeof content === 'string' ? content : Buffer.from(content, 'base64').toString('utf8')
        credsData[credsKey] = value
      }
    }
  } catch (err) {
    if (err.name !== 'NotFoundError') {
      throw err
    }
  }

  if (Object.keys(credsData).length === 0) {
    return
  }

  const leafCredsMapName = natsLeafCredsConfigMap(fog)
  const existing = await ConfigMapManager.getConfigMap(leafCredsMapName, transaction)
  const credsDataUnchanged = existing && _configMapDataHash(existing.data) === _configMapDataHash(credsData)
  if (!credsDataUnchanged) {
    if (existing) {
      await ConfigMapService.updateConfigMapEndpoint(leafCredsMapName, { data: credsData, immutable: false }, transaction)
    } else {
      await ConfigMapService.createConfigMapEndpoint({ name: leafCredsMapName, data: credsData, immutable: false, useVault: true }, transaction)
    }
  }

  await _ensureVolumeMount(leafCredsMapName, { configMapName: leafCredsMapName }, transaction)
  await VolumeMountService.linkVolumeMountEndpoint(leafCredsMapName, [fog.uuid], transaction)
  await _ensureVolumeMapping(fog.natsMicroserviceUuid, leafCredsMapName, NATS_CREDS_DIR, 'ro', 'volumeMount', transaction)
}

async function _buildLeafRemotes (fog, natsInstance, transaction) {
  await _buildLeafCredsConfigMap(fog, natsInstance, transaction)
}

/**
 * Ensures leaf user and creds configmap for a fog that has a NATS leaf instance.
 * Call after creating or updating a microservice with natsAccess so the leaf gets creds for that app.
 * Uses the same transaction so the new/updated microservice is visible to _getLeafAppIds.
 */
async function ensureLeafCredsForFog (fogUuid, transaction) {
  const fog = await FogManager.findOne({ uuid: fogUuid }, transaction)
  if (!fog) {
    return
  }
  const natsInstance = await NatsInstanceManager.findByFog(fog.uuid, transaction)
  if (!natsInstance) {
    return
  }
  const natsMicroservice = await MicroserviceManager.findOne({
    iofogUuid: fog.uuid,
    name: getSystemMicroserviceName('nats')
  }, transaction)
  if (natsMicroservice) {
    fog.natsMicroserviceUuid = natsMicroservice.uuid
  }
  if (natsInstance.isLeaf) {
    await _buildLeafRemotes(fog, natsInstance, transaction)
    const jwtBundle = await _buildJwtBundle(fog, natsInstance.isLeaf, transaction)
    await _ensureConfigMap(natsJwtBundleConfigMap(fog), jwtBundle, transaction)
  }
}

async function _computeLeafRemotesForInstance (fog, natsInstance, transaction, certName) {
  const remotes = []
  const upstreamConnections = await NatsConnectionManager.findAllWithNats(
    { sourceNats: natsInstance.id },
    transaction
  )
  if (!upstreamConnections || upstreamConnections.length === 0) {
    return remotes
  }
  const tlsConfig = certName ? {
    ca_file: `${NATS_CERTS_DIR}/${certName}/ca.crt`,
    cert_file: `${NATS_CERTS_DIR}/${certName}/tls.crt`,
    key_file: `${NATS_CERTS_DIR}/${certName}/tls.key`,
    verify: true,
    handshake_first: true,
    timeout: '3s'
  } : undefined
  const appIds = await _getLeafAppIds(fog, transaction)
  for (const appId of appIds) {
    const account = await NatsAuthService.ensureAccountForApplication(appId, transaction)
    for (const upstream of upstreamConnections) {
      if (!upstream.dest || !upstream.dest.host) {
        continue
      }
      const port = upstream.dest.leafPort || DEFAULT_LEAF_PORT
      const leafUserName = `leaf-${slugifyName(fog.name)}`
      const remote = {
        urls: [`tls://${upstream.dest.host}:${port}`],
        account: account.publicKey,
        credentials: `${NATS_CREDS_DIR}/${slugifyName(account.name)}/${slugifyName(leafUserName)}.creds`
      }
      if (tlsConfig) {
        remote.tls = tlsConfig
      }
      remotes.push(remote)
    }
  }
  return remotes
}

// Routes matching this pattern are considered created by the K8s operator and are preserved when patching the hub ConfigMap.
const DEFAULT_OPERATOR_ROUTE_PATTERN = /nats-headless/

function _isOperatorRoute (route) {
  if (typeof route !== 'string') return false
  return DEFAULT_OPERATOR_ROUTE_PATTERN.test(route)
}

function mergeK8sHubClusterRoutes (currentRoutes, desiredControllerRoutes) {
  const operatorRoutes = (currentRoutes || []).filter(r => typeof r === 'string' && _isOperatorRoute(r))
  return [...operatorRoutes, ...(desiredControllerRoutes || [])]
}

async function _getControllerManagedClusterRoutes (transaction) {
  const allServerInstances = await NatsInstanceManager.findAll({ isLeaf: false }, transaction)
  const routes = []
  for (const inst of allServerInstances || []) {
    if (!inst.host || inst.iofogUuid == null) {
      continue
    }
    routes.push(`nats://${inst.host}:${inst.clusterPort || DEFAULT_CLUSTER_PORT}`)
  }
  return routes
}

async function _computeClusterRoutesForInstance (natsInstance, transaction) {
  const allServerInstances = await NatsInstanceManager.findAll({ isLeaf: false }, transaction)
  const routes = []
  for (const inst of allServerInstances || []) {
    if (!inst.host) continue
    routes.push(`nats://${inst.host}:${inst.clusterPort || DEFAULT_CLUSTER_PORT}`)
  }
  return routes
}

async function _patchK8sHubConfigMapClusterRoutes (desiredControllerRoutes, transaction) {
  const configMap = await K8sClient.getConfigMap(K8S_NATS_SERVER_CONFIG_MAP, { ignoreNotFound: true })
  if (!configMap || !configMap.data) {
    logger.debug(`Hub ConfigMap ${K8S_NATS_SERVER_CONFIG_MAP} not found or empty (expected before operator creates it)`)
    return
  }
  const configKey = NATS_CONFIG_KEY
  const content = configMap.data[configKey]
  if (!content) {
    throw new Error(`Key ${configKey} not found in ConfigMap ${K8S_NATS_SERVER_CONFIG_MAP}`)
  }
  const routesMatch = content.match(/routes:\s*(\[[^\]]*\])/m)
  if (!routesMatch) {
    throw new Error(`Could not find routes in ${K8S_NATS_SERVER_CONFIG_MAP}`)
  }
  let currentRoutes
  try {
    currentRoutes = JSON.parse(routesMatch[1])
  } catch (e) {
    throw new Error(`Invalid routes JSON in ${K8S_NATS_SERVER_CONFIG_MAP}: ${e.message}`)
  }
  if (!Array.isArray(currentRoutes)) {
    currentRoutes = []
  }
  const newRoutes = mergeK8sHubClusterRoutes(currentRoutes, desiredControllerRoutes)
  const newRoutesJson = JSON.stringify(newRoutes)
  const newContent = content.replace(/routes:\s*\[[^\]]*\]/m, `routes: ${newRoutesJson}`)
  await K8sClient.patchConfigMap(K8S_NATS_SERVER_CONFIG_MAP, { data: { [configKey]: newContent } }, { ignoreNotFound: true })
}

function _clusterConfigRequiresRebuild (oldRoutes, newRoutes) {
  const oldLen = (oldRoutes && oldRoutes.length) || 0
  const newLen = (newRoutes && newRoutes.length) || 0
  if (oldLen === 0 && newLen > 0) {
    return true
  }
  if (oldLen > 0 && newLen < oldLen) {
    const oldSet = new Set(oldRoutes || [])
    const everyNewInOld = (newRoutes || []).every(r => oldSet.has(r))
    return everyNewInOld
  }
  return false
}

async function _renderAndPersistNatsConfig (fog, natsInstance, certName, mqttCertName, configMapName, configKey, template, isHub, isServerMode, transaction) {
  const systemAccount = isServerMode
    ? await NatsAuthService.ensureSystemAccount(transaction)
    : await NatsAuthService.ensureLeafSystemAccount(fog, transaction)
  const operator = await NatsAuthService.ensureOperator(transaction)
  const clusterRoutes = (isHub || isServerMode) ? await _computeClusterRoutesForInstance(natsInstance, transaction) : []
  if ((isHub || isServerMode) && clusterRoutes.length === 1) {
    template = readTemplate('server-no-cluster.conf')
  }
  const leafRemotes = isServerMode ? [] : await _computeLeafRemotesForInstance(fog, natsInstance, transaction, certName)
  const jetstreamKey = await _ensureJetstreamKey(fog, transaction)
  const jetstreamDomain = isHub || isServerMode
    ? (process.env.CONTROLLER_NAMESPACE || config.get('app.namespace'))
    : fog.name
  const leafAdvertiseHose = fog.host || fog.ipAddress || fog.ipAddressExternal
  const jsMaxMemory = _normalizeJetstreamSize(natsInstance.jsMemoryStoreSize, DEFAULT_JS_MEMORY_STORE_SIZE)
  const jsMaxFile = _normalizeJetstreamSize(natsInstance.jsStorageSize, DEFAULT_JS_STORAGE_SIZE)
  const serverName = (fog && fog.name) || (fog && fog.uuid) || 'nats'
  const variables = {
    OPERATOR_JWT: operator ? operator.jwt : undefined,
    SYSTEM_ACCOUNT: systemAccount.publicKey,
    NATS_CLUSTER_ROUTES: JSON.stringify(clusterRoutes),
    NATS_LEAF_REMOTES: JSON.stringify(leafRemotes),
    CONTROLLER_NAME: (process.env.CONTROLLER_NAME || config.get('app.name')),
    SERVER_NAME: _escapeConfString(serverName),
    JETSTREAM_DOMAIN: _escapeConfString(jetstreamDomain),
    JETSTREAM_KEY: _escapeConfString(jetstreamKey.jsk),
    JETSTREAM_PREV_KEY: _escapeConfString(jetstreamKey.prevKey || ''),
    NATS_SERVER_PORT: natsInstance.serverPort,
    NATS_LEAF_PORT: natsInstance.leafPort,
    NATS_LEAF_ADVERTISE: leafAdvertiseHose,
    NATS_CLUSTER_PORT: natsInstance.clusterPort,
    NATS_MQTT_PORT: natsInstance.mqttPort,
    NATS_HTTP_PORT: natsInstance.httpPort,
    NATS_SSL_DIR: NATS_CERTS_DIR,
    NATS_CERT_NAME: certName,
    NATS_MQTT_CERT_NAME: mqttCertName,
    NATS_JWT_DIR: NATS_JWT_DIR,
    NATS_JS_MAX_MEMORY_STORE: jsMaxMemory,
    NATS_JS_MAX_FILE_STORE: jsMaxFile
  }
  const renderedTemplate = renderTemplate(template, variables)
  await _ensureConfigMap(configMapName, { [configKey]: renderedTemplate }, transaction)
  return renderedTemplate
}

async function _ensureJetstreamKey (fog, transaction) {
  const secretName = natsJetstreamKeySecretName(fog)
  try {
    const secret = await SecretService.getSecretEndpoint(secretName, transaction)
    if (secret && secret.data && secret.data.jsk) {
      return { secretName, jsk: secret.data.jsk }
    }
  } catch (error) {
    if (error.name !== 'NotFoundError') {
      throw error
    }
  }

  const key = crypto.randomBytes(32).toString('base64')
  await SecretService.createSecretEndpoint({
    name: secretName,
    type: 'Opaque',
    data: { jsk: key }
  }, transaction)
  return { secretName, jsk: key }
}

async function _validateAndReturnUpstreamNats (upstreamNatsIds, isSystemFog, defaultHub, transaction) {
  if (!upstreamNatsIds) {
    if (!defaultHub) {
      if (isSystemFog) {
        return []
      }
      throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_NATS, Constants.DEFAULT_NATS_HUB_NAME))
    }

    const allSystemFogs = await FogManager.findAll({ isSystem: true }, transaction)
    const systemFogNats = []
    for (const systemFog of allSystemFogs) {
      const systemFogNatsInstance = await NatsInstanceManager.findOne({
        iofogUuid: systemFog.uuid
      }, transaction)
      if (systemFogNatsInstance) {
        systemFogNats.push(systemFogNatsInstance)
      }
    }

    const combinedNats = [defaultHub]
    for (const systemFogNatsInstance of systemFogNats) {
      if (systemFogNatsInstance.id !== defaultHub.id) {
        combinedNats.push(systemFogNatsInstance)
      }
    }

    return combinedNats
  }

  const upstreamNats = []
  for (const upstreamId of upstreamNatsIds) {
    let upstreamNatsInstance = upstreamId === Constants.DEFAULT_NATS_HUB_NAME
      ? defaultHub
      : await NatsInstanceManager.findOne({ iofogUuid: upstreamId }, transaction)
    if (!upstreamNatsInstance && upstreamId !== Constants.DEFAULT_NATS_HUB_NAME) {
      const fog = await FogManager.findOne({ name: upstreamId }, transaction)
      if (!fog) {
        throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_NATS, upstreamId))
      }
      upstreamNatsInstance = await NatsInstanceManager.findOne({ iofogUuid: fog.uuid }, transaction)
    }
    if (!upstreamNatsInstance) {
      throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_NATS, upstreamId))
    }
    if (upstreamNatsInstance.isLeaf) {
      throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.INVALID_UPSTREAM_NATS, upstreamId))
    }
    upstreamNats.push(upstreamNatsInstance)
  }
  return upstreamNats
}

async function _ensureNatsMicroservice (fog, mode, transaction) {
  const application = await ensureSystemApplication(fog, transaction)
  const name = getSystemMicroserviceName('nats')
  let microservice = await MicroserviceManager.findOne({
    name,
    applicationId: application.id
  }, transaction)

  if (!microservice) {
    const catalog = await CatalogService.getNatsCatalogItem(transaction)
    if (!catalog) {
      throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_CATALOG_ITEM_ID, 'NATs'))
    }
    const data = {
      uuid: AppHelper.generateUUID(),
      name: name,
      config: '{}',
      catalogItemId: catalog.id,
      iofogUuid: fog.uuid,
      hostNetworkMode: false,
      isPrivileged: false,
      logSize: 1,
      schedule: 1,
      configLastUpdated: Date.now(),
      applicationId: application.id
    }
    const capAddValues = [
      { capAdd: 'NET_RAW' }
    ]
    microservice = await MicroserviceManager.create(data, transaction)
    await MicroserviceStatusManager.create({ microserviceUuid: microservice.uuid }, transaction)
    await MicroserviceExecStatusManager.create({ microserviceUuid: microservice.uuid }, transaction)
    for (const capAdd of capAddValues) {
      await MicroserviceCapAddManager.create({
        microserviceUuid: data.uuid,
        capAdd: capAdd.capAdd
      }, transaction)
    }
    const jetstreamMappingCreated = await _ensureVolumeMapping(microservice.uuid, `${fog.name}-nats-jetstream`, '/home/runner/data', 'rw', 'volume', transaction)
    microservice._volumeMappingCreated = jetstreamMappingCreated
  }

  fog.natsMicroserviceUuid = microservice.uuid

  const defaultHealthCheck = {
    test: ['CMD-SHELL', "curl -f http://localhost:8222/healthz | grep -q 'status.*ok' || exit 1"],
    interval: 30,
    timeout: 10,
    startPeriod: 60,
    retries: 3
  }
  const existingHealthCheck = await MicroserviceHealthCheckManager.findOne(
    { microserviceUuid: microservice.uuid },
    transaction
  )
  const healthCheckData = {
    microserviceUuid: microservice.uuid,
    test: JSON.stringify(defaultHealthCheck.test),
    interval: defaultHealthCheck.interval,
    timeout: defaultHealthCheck.timeout,
    startPeriod: defaultHealthCheck.startPeriod,
    retries: defaultHealthCheck.retries
  }
  if (existingHealthCheck) {
    await MicroserviceHealthCheckManager.update(
      { microserviceUuid: microservice.uuid },
      {
        test: healthCheckData.test,
        interval: healthCheckData.interval,
        timeout: healthCheckData.timeout,
        startPeriod: healthCheckData.startPeriod,
        retries: healthCheckData.retries
      },
      transaction
    )
  } else {
    await MicroserviceHealthCheckManager.create(healthCheckData, transaction)
  }

  return microservice
}

/**
 * Removes leaf-only artifacts when a fog transitions from leaf to server: volume mappings,
 * mount endpoints, leaf JWT bundle and leaf creds ConfigMaps, and DB leaf system account/user.
 * Call only when instance was leaf and is now server.
 */
async function _removeLeafOnlyArtifactsForFog (fog, microservice, transaction) {
  const leafArtifacts = await NatsAuthService.getLeafSystemArtifactSecretNames(fog, transaction)
  const mountNamesToRemove = [
    natsJwtBundleConfigMap(fog),
    natsLeafCredsConfigMap(fog)
  ]
  if (leafArtifacts && leafArtifacts.credsSecretName) {
    mountNamesToRemove.push(leafArtifacts.credsSecretName)
  }
  for (const mountName of mountNamesToRemove) {
    await VolumeMappingManager.delete({
      microserviceUuid: microservice.uuid,
      hostDestination: mountName,
      type: 'volumeMount'
    }, transaction)
    try {
      await VolumeMountService.unlinkVolumeMountEndpoint(mountName, [fog.uuid], transaction)
    } catch (error) {
      if (error.name !== 'NotFoundError') throw error
    }
    try {
      const linkedFogs = await VolumeMountService.findVolumeMountedFogNodes(mountName, transaction)
      if (!linkedFogs || linkedFogs.length === 0) {
        await VolumeMountService.deleteVolumeMountEndpoint(mountName, transaction)
      }
    } catch (error) {
      if (error.name !== 'NotFoundError') throw error
    }
  }
  for (const configMapName of [natsJwtBundleConfigMap(fog), natsLeafCredsConfigMap(fog)]) {
    try {
      await ConfigMapService.deleteConfigMapEndpoint(configMapName, transaction)
    } catch (error) {
      if (error.name !== 'NotFoundError') throw error
    }
  }
  await NatsAuthService.deleteLeafSystemArtifactsForFog(fog, transaction)
}

async function ensureNatsForFog (fog, natsConfig, transaction) {
  const mode = (natsConfig && natsConfig.mode) || 'leaf'
  if (mode === 'none') {
    return null
  }

  const existingHub = await NatsInstanceManager.findOne({ isHub: true }, transaction)
  let isHub
  let isLeaf
  if (_isKubernetesControlPlane()) {
    isHub = false
    isLeaf = (mode === 'leaf')
  } else {
    isHub = (existingHub && existingHub.iofogUuid === fog.uuid) || (!existingHub && fog.isSystem === true && mode === 'server')
    isLeaf = (mode === 'leaf')
  }

  const serverPort = (natsConfig && natsConfig.serverPort) || DEFAULT_SERVER_PORT
  const leafPort = (natsConfig && natsConfig.leafPort) || DEFAULT_LEAF_PORT
  const clusterPort = (natsConfig && natsConfig.clusterPort) || DEFAULT_CLUSTER_PORT
  const mqttPort = (natsConfig && natsConfig.mqttPort) || DEFAULT_MQTT_PORT
  const httpPort = (natsConfig && natsConfig.httpPort) || DEFAULT_HTTP_PORT

  const { serverCertName, mqttCertName } = await _ensureNatsCertificates(fog, transaction)
  const configMapName = natsConfigMapName(fog)
  const configKey = NATS_CONFIG_KEY
  const template = !isLeaf ? readTemplate('server.conf') : readTemplate('leaf.conf')
  const certName = serverCertName

  const jwtBundleConfigMapName = isLeaf ? natsJwtBundleConfigMap(fog) : K8S_NATS_JWT_BUNDLE_CONFIG_MAP
  if (isLeaf) {
    const jwtBundle = await _buildJwtBundle(fog, true, transaction)
    await _ensureConfigMap(natsJwtBundleConfigMap(fog), jwtBundle, transaction)
  } else {
    const fullJwtBundle = await _buildHubJwtBundle(transaction)
    await _ensureConfigMap(K8S_NATS_JWT_BUNDLE_CONFIG_MAP, fullJwtBundle, transaction)
  }

  const microserviceResult = await _ensureNatsMicroservice(fog, mode, transaction)
  const microservice = microserviceResult
  let anyVolumeMappingCreated = !!(microservice && microservice._volumeMappingCreated)

  const jetstreamKey = await _ensureJetstreamKey(fog, transaction)
  const sysAccountName = isLeaf ? NatsAuthService.leafSystemAccountName(fog) : NatsAuthService.SYSTEM_ACCOUNT_NAME
  const sysUserName = isLeaf ? NatsAuthService.leafSystemAccountUserName(fog) : NatsAuthService.sysUserNameForServer(isHub, fog)
  const sysCredPath = `${NATS_CREDS_DIR}/${slugifyName(sysAccountName)}/${slugifyName(sysUserName)}.creds`
  const env = [
    { key: 'JETSTREAM_KEY', value: jetstreamKey.jsk, valueFromSecret: `${jetstreamKey.secretName}/jsk` },
    { key: 'JETSTREAM_PREV_KEY', value: '' },
    { key: 'NATS_JWT_DIR', value: NATS_JWT_DIR },
    { key: 'NATS_JWT_MOUNT_DIR', value: NATS_JWT_MOUNT_DIR },
    { key: 'NATS_CREDS_DIR', value: NATS_CREDS_DIR },
    { key: 'NATS_SYS_USER_CRED_PATH', value: sysCredPath },
    { key: 'NATS_SSL_DIR', value: NATS_CERTS_DIR },
    { key: 'NATS_CERT_NAME', value: certName },
    { key: 'NATS_MQTT_CERT_NAME', value: mqttCertName },
    { key: 'NATS_CONF', value: `${NATS_CONFIG_DIR}/${configKey}` },
    { key: 'NATS_SERVER_PORT', value: String(serverPort) },
    { key: 'NATS_LEAF_PORT', value: String(leafPort) },
    { key: 'NATS_CLUSTER_PORT', value: String(clusterPort) },
    { key: 'NATS_MQTT_PORT', value: String(mqttPort) },
    { key: 'NATS_HTTP_PORT', value: String(httpPort) },
    { key: 'NATS_MONITOR_PORT', value: String(httpPort) },
    { key: 'NATS_JETSTREAM_STORE_DIR', value: '/home/runner/data' },
    { key: 'NATS_SERVER_MODE', value: `${mode}` }
  ]

  const instance = await NatsInstanceManager.findByFog(fog.uuid, transaction)
  let oldRoutesByInstanceId = null
  let oldRoutesForCurrent = []
  if (!isLeaf) {
    const allServerInstances = await NatsInstanceManager.findAll({ isLeaf: false }, transaction)
    oldRoutesByInstanceId = new Map()
    for (const inst of allServerInstances || []) {
      oldRoutesByInstanceId.set(inst.id, await _computeClusterRoutesForInstance(inst, transaction))
    }
    oldRoutesForCurrent = instance ? (oldRoutesByInstanceId.get(instance.id) || []) : []
  }
  const jsStorageSizeRaw = (natsConfig && natsConfig.jsStorageSize) != null ? String(natsConfig.jsStorageSize).trim() : null
  const jsMemoryStoreSizeRaw = (natsConfig && natsConfig.jsMemoryStoreSize) != null ? String(natsConfig.jsMemoryStoreSize).trim() : null
  if (jsStorageSizeRaw !== undefined && jsStorageSizeRaw !== null && jsStorageSizeRaw !== '') {
    _normalizeJetstreamSize(jsStorageSizeRaw, DEFAULT_JS_STORAGE_SIZE)
  }
  if (jsMemoryStoreSizeRaw !== undefined && jsMemoryStoreSizeRaw !== null && jsMemoryStoreSizeRaw !== '') {
    _normalizeJetstreamSize(jsMemoryStoreSizeRaw, DEFAULT_JS_MEMORY_STORE_SIZE)
  }
  const jsStorageSize = (jsStorageSizeRaw !== undefined && jsStorageSizeRaw !== null && jsStorageSizeRaw !== '')
    ? jsStorageSizeRaw
    : (instance && (instance.jsStorageSize != null && instance.jsStorageSize !== '')) ? instance.jsStorageSize : DEFAULT_JS_STORAGE_SIZE
  const jsMemoryStoreSize = (jsMemoryStoreSizeRaw !== undefined && jsMemoryStoreSizeRaw !== null && jsMemoryStoreSizeRaw !== '')
    ? jsMemoryStoreSizeRaw
    : (instance && (instance.jsMemoryStoreSize != null && instance.jsMemoryStoreSize !== '')) ? instance.jsMemoryStoreSize : DEFAULT_JS_MEMORY_STORE_SIZE
  const instanceData = {
    iofogUuid: fog.uuid,
    isLeaf,
    isHub,
    host: fog.host,
    serverPort,
    leafPort,
    clusterPort,
    mqttPort,
    httpPort,
    configMapName: configMapName,
    jwtDirMountName: natsJwtDirMount(fog),
    certSecretName: certName,
    jsStorageSize: jsStorageSize || DEFAULT_JS_STORAGE_SIZE,
    jsMemoryStoreSize: jsMemoryStoreSize || DEFAULT_JS_MEMORY_STORE_SIZE
  }
  let savedInstance = instance
  if (savedInstance) {
    await NatsInstanceManager.update({ id: savedInstance.id }, instanceData, transaction)
    savedInstance = await NatsInstanceManager.findOne({ id: savedInstance.id }, transaction)
  } else {
    savedInstance = await NatsInstanceManager.create(instanceData, transaction)
  }

  if (instance && instance.isLeaf && !savedInstance.isLeaf && microservice) {
    await _removeLeafOnlyArtifactsForFog(fog, microservice, transaction)
  }

  let upstreamIds = natsConfig && natsConfig.upstreamNatsServers
  if (typeof upstreamIds === 'string') {
    try {
      upstreamIds = JSON.parse(upstreamIds)
    } catch (error) {
      upstreamIds = []
    }
  }
  const defaultHub = await NatsInstanceManager.findOne({ isHub: true }, transaction)
  const upstreamNats = await _validateAndReturnUpstreamNats(upstreamIds, fog.isSystem === true, defaultHub, transaction)

  const existingConnections = await NatsConnectionManager.findAllWithNats(
    { sourceNats: savedInstance.id },
    transaction
  )
  const existingDestIds = new Set(existingConnections.map(conn => conn.dest && conn.dest.id).filter(Boolean))
  const desiredDestIds = new Set(upstreamNats.map(node => node.id))
  for (const connection of existingConnections) {
    if (connection.dest && !desiredDestIds.has(connection.dest.id)) {
      await NatsConnectionManager.delete({ id: connection.id }, transaction)
    }
  }
  for (const upstream of upstreamNats) {
    if (!existingDestIds.has(upstream.id)) {
      await NatsConnectionManager.create({ sourceNats: savedInstance.id, destNats: upstream.id }, transaction)
    }
  }

  await _renderAndPersistNatsConfig(
    fog,
    savedInstance,
    certName,
    mqttCertName,
    configMapName,
    configKey,
    template,
    isHub,
    !savedInstance.isLeaf,
    transaction
  )

  if (_isKubernetesControlPlane() && !savedInstance.isLeaf && savedInstance.host) {
    try {
      const desiredControllerRoutes = await _getControllerManagedClusterRoutes(transaction)
      await _patchK8sHubConfigMapClusterRoutes(desiredControllerRoutes, transaction)
    } catch (err) {
      logger.warn(`Failed to patch Kubernetes NATS hub ConfigMap cluster routes: ${err.message}`)
    }
  }

  if (!savedInstance.isLeaf) {
    const newRoutesForCurrent = await _computeClusterRoutesForInstance(savedInstance, transaction)
    if (_clusterConfigRequiresRebuild(oldRoutesForCurrent, newRoutesForCurrent)) {
      const natsMicroservice = await MicroserviceManager.findOne({ iofogUuid: fog.uuid, name: getSystemMicroserviceName('nats') }, transaction)
      if (natsMicroservice) {
        await MicroserviceManager.update({ uuid: natsMicroservice.uuid }, { rebuild: true }, transaction)
        await ChangeTrackingService.update(fog.uuid, ChangeTrackingService.events.microserviceList, transaction)
      }
    }
    const allServerInstancesNow = await NatsInstanceManager.findAll({ isLeaf: false }, transaction)
    const otherInstances = (allServerInstancesNow || []).filter(i => i.id !== savedInstance.id)
    if (otherInstances.length > 0) {
      const otherFogUuids = otherInstances.map((i) => i.iofogUuid).filter(Boolean)
      await enqueueReconcileTask({ reason: 'cluster-routes-changed', fogUuids: otherFogUuids }, transaction)
    }
  }

  await _ensureVolumeMount(configMapName, { configMapName: configMapName }, transaction)
  await _ensureVolumeMount(natsJwtDirMount(fog), { configMapName: jwtBundleConfigMapName }, transaction)
  await _ensureVolumeMount(certName, { secretName: certName }, transaction)
  await _ensureVolumeMount(mqttCertName, { secretName: mqttCertName }, transaction)

  await VolumeMountService.linkVolumeMountEndpoint(configMapName, [fog.uuid], transaction)
  await VolumeMountService.linkVolumeMountEndpoint(natsJwtDirMount(fog), [fog.uuid], transaction)
  await VolumeMountService.linkVolumeMountEndpoint(certName, [fog.uuid], transaction)
  await VolumeMountService.linkVolumeMountEndpoint(mqttCertName, [fog.uuid], transaction)

  anyVolumeMappingCreated = (await _ensureVolumeMapping(microservice.uuid, configMapName, NATS_CONFIG_DIR, 'ro', 'volumeMount', transaction)) || anyVolumeMappingCreated
  anyVolumeMappingCreated = (await _ensureVolumeMapping(microservice.uuid, natsJwtDirMount(fog), NATS_JWT_MOUNT_DIR, 'rw', 'volumeMount', transaction)) || anyVolumeMappingCreated
  anyVolumeMappingCreated = (await _ensureVolumeMapping(microservice.uuid, certName, `${NATS_CERTS_DIR}/${certName}`, 'ro', 'volumeMount', transaction)) || anyVolumeMappingCreated
  anyVolumeMappingCreated = (await _ensureVolumeMapping(microservice.uuid, mqttCertName, `${NATS_CERTS_DIR}/${mqttCertName}`, 'ro', 'volumeMount', transaction)) || anyVolumeMappingCreated

  if (isHub) {
    const { user: hubSysUser } = await NatsAuthService.ensureSysUserForServer({ isHub: true }, transaction)
    const credsSecretName = hubSysUser.credsSecretName
    await _ensureVolumeMount(credsSecretName, { secretName: credsSecretName }, transaction)
    await VolumeMountService.linkVolumeMountEndpoint(credsSecretName, [fog.uuid], transaction)
    anyVolumeMappingCreated = (await _ensureVolumeMapping(microservice.uuid, credsSecretName, NATS_CREDS_DIR, 'ro', 'volumeMount', transaction)) || anyVolumeMappingCreated
  } else if (!savedInstance.isLeaf) {
    const { user: serverSysUser } = await NatsAuthService.ensureSysUserForServer({ isHub: false, fog }, transaction)
    const credsSecretName = serverSysUser.credsSecretName
    await _ensureVolumeMount(credsSecretName, { secretName: credsSecretName }, transaction)
    await VolumeMountService.linkVolumeMountEndpoint(credsSecretName, [fog.uuid], transaction)
    anyVolumeMappingCreated = (await _ensureVolumeMapping(microservice.uuid, credsSecretName, NATS_CREDS_DIR, 'ro', 'volumeMount', transaction)) || anyVolumeMappingCreated
  } else {
    const sysCredsSecretName = await _getSysUserCredsSecretNameForFog(fog, false, transaction)
    if (sysCredsSecretName) {
      await VolumeMappingManager.delete({
        microserviceUuid: microservice.uuid,
        hostDestination: sysCredsSecretName,
        type: 'volumeMount'
      }, transaction)
      try {
        await VolumeMountService.unlinkVolumeMountEndpoint(sysCredsSecretName, [fog.uuid], transaction)
      } catch (err) {
        if (err.name !== 'NotFoundError') {
          throw err
        }
      }
    }
    await _buildLeafRemotes(fog, savedInstance, transaction)
  }

  await _replaceMicroserviceEnv(microservice.uuid, env, transaction)
  await _ensureNatsPorts(microservice.uuid, [serverPort, clusterPort, leafPort, mqttPort, httpPort], transaction, fog.uuid)

  if (anyVolumeMappingCreated) {
    await MicroserviceManager.update({ uuid: microservice.uuid }, { rebuild: true }, transaction)
  }
  await ChangeTrackingService.update(fog.uuid, ChangeTrackingService.events.microserviceList, transaction)

  return microservice
}

async function cleanupNatsForFog (fog, transaction) {
  const natsInstance = await NatsInstanceManager.findByFog(fog.uuid, transaction)
  const mountNames = [
    natsConfigMapName(fog),
    natsJwtDirMount(fog),
    natsLeafCredsConfigMap(fog),
    natsServerCertName(fog),
    natsLocalMQTTCertName(fog)
  ]
  let sysCredsSecretName = null
  if (natsInstance && !natsInstance.isLeaf) {
    sysCredsSecretName = await _getSysUserCredsSecretNameForFog(fog, !!natsInstance.isHub, transaction)
    if (sysCredsSecretName) {
      mountNames.push(sysCredsSecretName)
    }
  }
  const configMapNames = [
    natsConfigMapName(fog),
    ...(natsInstance && natsInstance.isLeaf ? [natsJwtBundleConfigMap(fog)] : []),
    natsLeafCredsConfigMap(fog),
    natsServerConfigMap(fog),
    natsLeafConfigMap(fog)
  ]
  const secretNames = [
    natsServerCertName(fog),
    natsLocalMQTTCertName(fog),
    natsJetstreamKeySecretName(fog),
    natsLocalCaName(fog)
  ]
  if (sysCredsSecretName) {
    secretNames.push(sysCredsSecretName)
  }
  if (natsInstance && natsInstance.isLeaf) {
    const leafArtifacts = await NatsAuthService.getLeafSystemArtifactSecretNames(fog, transaction)
    if (leafArtifacts) {
      if (leafArtifacts.credsSecretName) {
        mountNames.push(leafArtifacts.credsSecretName)
        secretNames.push(leafArtifacts.credsSecretName)
      }
      if (leafArtifacts.seedSecretName) {
        secretNames.push(leafArtifacts.seedSecretName)
      }
    }
  }

  logger.info(`Cleaning up NATS artifacts for fog ${fog.uuid}`)
  const wasLeaf = !!(natsInstance && natsInstance.isLeaf)
  const wasServer = !!(natsInstance && !natsInstance.isLeaf)
  const wasHub = !!(natsInstance && natsInstance.isHub)
  if (natsInstance) {
    await NatsConnectionManager.delete({ sourceNats: natsInstance.id }, transaction)
    await NatsConnectionManager.delete({ destNats: natsInstance.id }, transaction)
    await NatsInstanceManager.delete({ id: natsInstance.id }, transaction)
    if (_isKubernetesControlPlane() && !natsInstance.isLeaf) {
      try {
        const desiredControllerRoutes = await _getControllerManagedClusterRoutes(transaction)
        await _patchK8sHubConfigMapClusterRoutes(desiredControllerRoutes, transaction)
        try {
          await K8sClient.rolloutStatefulSet('nats')
        } catch (rolloutErr) {
          logger.warn(`Failed to rollout NATS StatefulSet after hub ConfigMap patch: ${rolloutErr.message}`)
        }
      } catch (err) {
        logger.warn(`Failed to patch Kubernetes NATS hub ConfigMap cluster routes after cleanup: ${err.message}`)
      }
    }
    if (!natsInstance.isLeaf) {
      const remainingServers = await NatsInstanceManager.findAll({ isLeaf: false }, transaction)
      if (remainingServers && remainingServers.length > 0) {
        const remainingFogUuids = remainingServers.map((s) => s.iofogUuid).filter(Boolean)
        await enqueueReconcileTask({ reason: 'server-deleted', fogUuids: remainingFogUuids }, transaction)
      }
    }
  }

  const fogMicroservices = await MicroserviceManager.findAll({ iofogUuid: fog.uuid }, transaction)
  for (const microservice of fogMicroservices) {
    for (const mountName of mountNames) {
      await VolumeMappingManager.delete({
        microserviceUuid: microservice.uuid,
        hostDestination: mountName,
        type: 'volumeMount'
      }, transaction)
    }
  }

  for (const mountName of mountNames) {
    try {
      await VolumeMountService.unlinkVolumeMountEndpoint(mountName, [fog.uuid], transaction)
    } catch (error) {
      if (error.name !== 'NotFoundError') {
        throw error
      }
    }

    try {
      const linkedFogs = await VolumeMountService.findVolumeMountedFogNodes(mountName, transaction)
      if (!linkedFogs || linkedFogs.length === 0) {
        await VolumeMountService.deleteVolumeMountEndpoint(mountName, transaction)
      }
    } catch (error) {
      if (error.name !== 'NotFoundError') {
        throw error
      }
    }
  }

  for (const configMapName of configMapNames) {
    try {
      await ConfigMapService.deleteConfigMapEndpoint(configMapName, transaction)
    } catch (error) {
      if (error.name !== 'NotFoundError') {
        throw error
      }
    }
  }

  for (const secretName of secretNames) {
    try {
      await SecretService.deleteSecretEndpoint(secretName, transaction)
    } catch (error) {
      if (error.name !== 'NotFoundError') {
        throw error
      }
    }
  }

  if (wasLeaf) {
    await NatsAuthService.deleteLeafSystemArtifactsForFog(fog, transaction)
  }
  if (wasServer) {
    await NatsAuthService.deleteServerSysUserForFog(fog, wasHub, transaction)
  }
}

function _getAffectedFogUuidsForApplication (applicationId, natsInstanceByFog, microservicesByFog) {
  const out = new Set()
  for (const [fogUuid, ni] of natsInstanceByFog) {
    if (!ni.isLeaf) out.add(fogUuid)
  }
  for (const [fogUuid, msList] of microservicesByFog) {
    if (msList.some(ms => ms.applicationId === applicationId)) out.add(fogUuid)
  }
  return out
}

function _getAffectedFogUuidsForAccountRule (accountRuleId, natsInstanceByFog, microservicesByFog, applicationsWithNatsById) {
  const appIds = []
  for (const [appId, app] of applicationsWithNatsById) {
    if (app.natsRuleId === accountRuleId) appIds.push(appId)
  }
  const out = new Set()
  for (const [fogUuid, ni] of natsInstanceByFog) {
    if (!ni.isLeaf) out.add(fogUuid)
  }
  for (const [fogUuid, msList] of microservicesByFog) {
    if (msList.some(ms => appIds.includes(ms.applicationId))) out.add(fogUuid)
  }
  return out
}

async function _getAffectedFogUuidsForUserRule (userRuleId, natsInstanceByFog, transaction) {
  const out = new Set()
  for (const [fogUuid, ni] of natsInstanceByFog) {
    if (!ni.isLeaf) out.add(fogUuid)
  }
  const microservicesWithRule = await MicroserviceManager.findAll({ natsRuleId: userRuleId }, transaction)
  for (const ms of microservicesWithRule || []) {
    if (ms.iofogUuid) out.add(ms.iofogUuid)
  }
  const natsUserEntity = NatsUserManager.getEntity()
  if (natsUserEntity.rawAttributes && natsUserEntity.rawAttributes.natsUserRuleId) {
    const usersWithRule = await NatsUserManager.findAll({ natsUserRuleId: userRuleId }, transaction)
    for (const u of usersWithRule || []) {
      if (u.microserviceUuid) {
        const ms = await MicroserviceManager.findOne({ uuid: u.microserviceUuid }, transaction)
        if (ms && ms.iofogUuid) out.add(ms.iofogUuid)
      }
    }
  }
  return out
}

async function _reconcileResolverArtifactsOnce (options = {}, transaction) {
  const NatsAuthServiceRuntime = require('./nats-auth-service')

  const fogs = await FogManager.findAll({}, transaction)
  const applicationsWithNats = await ApplicationManager.findAll({ natsAccess: true }, transaction)
  const appIdsFromNatsApps = (applicationsWithNats || []).map((a) => a.id)
  const applicationsWithNatsById = new Map((applicationsWithNats || []).map((a) => [a.id, a]))

  const natsInstances = await NatsInstanceManager.findAll({}, transaction)
  const natsInstanceByFog = new Map()
  for (const ni of natsInstances || []) {
    if (ni.iofogUuid) {
      natsInstanceByFog.set(ni.iofogUuid, ni)
    }
  }

  const microservices = appIdsFromNatsApps.length > 0
    ? await MicroserviceManager.findAll({ applicationId: { [Op.in]: appIdsFromNatsApps } }, transaction)
    : []
  const microservicesByFog = new Map()
  for (const ms of microservices) {
    if (ms.iofogUuid) {
      if (!microservicesByFog.has(ms.iofogUuid)) {
        microservicesByFog.set(ms.iofogUuid, [])
      }
      microservicesByFog.get(ms.iofogUuid).push(ms)
    }
  }

  let candidateFogs
  const fogFilter = Array.isArray(options.fogUuids) && options.fogUuids.length > 0 ? new Set(options.fogUuids) : null
  const reason = options.reason || 'auth-mutation'
  if (fogFilter) {
    candidateFogs = fogs.filter((fog) => fogFilter.has(fog.uuid))
  } else if ((reason === 'account-created' || reason === 'account-deleted') && options.applicationId != null) {
    const affected = _getAffectedFogUuidsForApplication(options.applicationId, natsInstanceByFog, microservicesByFog)
    candidateFogs = fogs.filter((f) => affected.has(f.uuid))
  } else if (reason === 'account-rule-updated' && options.accountRuleId != null) {
    const affected = _getAffectedFogUuidsForAccountRule(options.accountRuleId, natsInstanceByFog, microservicesByFog, applicationsWithNatsById)
    candidateFogs = fogs.filter((f) => affected.has(f.uuid))
  } else if (reason === 'user-rule-updated' && options.userRuleId != null) {
    const affected = await _getAffectedFogUuidsForUserRule(options.userRuleId, natsInstanceByFog, transaction)
    candidateFogs = fogs.filter((f) => affected.has(f.uuid))
  } else if (reason === 'system-account-created') {
    candidateFogs = fogs.filter((f) => {
      const ni = natsInstanceByFog.get(f.uuid)
      return ni && !ni.isLeaf
    })
  } else {
    candidateFogs = fogs
  }
  logger.info(`Reconciling NATS resolver artifacts for ${candidateFogs.length} fog(s)`)

  const skipReissueForAccountDeleted = (reason === 'account-deleted')
  const candidateFogUuids = candidateFogs.map((f) => f.uuid)

  const natsAccounts = appIdsFromNatsApps.length > 0
    ? await NatsAccountManager.findAll({ applicationId: { [Op.in]: appIdsFromNatsApps } }, transaction)
    : []
  const accountByAppId = new Map((natsAccounts || []).map((a) => [a.applicationId, a]))

  const reconcileTriggerOptions = { triggerReconcile: false }
  await NatsAuthServiceRuntime.ensureSystemAccount(transaction, reconcileTriggerOptions)
  const systemAccount = await NatsAccountManager.findOne({ isSystem: true }, transaction)

  const systemNatsMicroservices = candidateFogUuids.length > 0
    ? await MicroserviceManager.findAll({
      name: getSystemMicroserviceName('nats'),
      iofogUuid: { [Op.in]: candidateFogUuids }
    }, transaction)
    : []
  const systemNatsMicroserviceByFog = new Map((systemNatsMicroservices || []).map((m) => [m.iofogUuid, m]))

  const maps = {
    applicationsWithNatsById,
    accountByAppId,
    systemAccount,
    microservicesByFog
  }

  const fullServerJwtBundle = await _buildHubJwtBundle(transaction)
  await _ensureConfigMap(K8S_NATS_JWT_BUNDLE_CONFIG_MAP, fullServerJwtBundle, transaction)

  for (const fog of candidateFogs) {
    const natsMicroservice = systemNatsMicroserviceByFog.get(fog.uuid)
    if (natsMicroservice) {
      fog.natsMicroserviceUuid = natsMicroservice.uuid
    }

    const fogMicroservices = microservicesByFog.get(fog.uuid) || []
    if (!skipReissueForAccountDeleted) {
      for (const microservice of fogMicroservices) {
        if (!microservice.natsAccess || !microservice.applicationId) continue
        const app = applicationsWithNatsById.get(microservice.applicationId)
        if (!app || !app.natsAccess) continue
        await NatsAuthServiceRuntime.reissueUserForMicroservice(microservice.uuid, transaction, reconcileTriggerOptions)
      }
    }

    const natsInstance = natsInstanceByFog.get(fog.uuid)
    if (!natsInstance) {
      continue
    }
    try {
      const isHub = !!natsInstance.isHub
      const isServerMode = !natsInstance.isLeaf
      if (natsInstance.isLeaf) {
        const leafJwtBundle = await _buildJwtBundleFromMaps(fog, true, maps, transaction)
        await _ensureConfigMap(natsJwtBundleConfigMap(fog), leafJwtBundle, transaction)
      } else {
        await _ensureVolumeMount(natsJwtDirMount(fog), { configMapName: K8S_NATS_JWT_BUNDLE_CONFIG_MAP }, transaction)
        await VolumeMountService.linkVolumeMountEndpoint(natsJwtDirMount(fog), [fog.uuid], transaction)
        if (fog.natsMicroserviceUuid) {
          await _ensureVolumeMapping(fog.natsMicroserviceUuid, natsJwtDirMount(fog), NATS_JWT_MOUNT_DIR, 'rw', 'volumeMount', transaction)
        }
      }
      if (natsInstance.isLeaf && fog.natsMicroserviceUuid) {
        await _buildLeafRemotes(fog, natsInstance, transaction)
      }

      const certName = natsInstance.certSecretName || natsServerCertName(fog)
      const mqttCertName = natsLocalMQTTCertName(fog)
      const configMapName = natsInstance.configMapName || natsConfigMapName(fog)
      const configKey = NATS_CONFIG_KEY
      const template = isServerMode ? readTemplate('server.conf') : readTemplate('leaf.conf')
      await _renderAndPersistNatsConfig(
        fog,
        natsInstance,
        certName,
        mqttCertName,
        configMapName,
        configKey,
        template,
        isHub,
        isServerMode,
        transaction
      )
      if (isServerMode && (reason === 'server-deleted' || reason === 'cluster-routes-changed') && fog.natsMicroserviceUuid) {
        await MicroserviceManager.update({ uuid: fog.natsMicroserviceUuid }, { rebuild: true }, transaction)
        await ChangeTrackingService.update(fog.uuid, ChangeTrackingService.events.microserviceList, transaction)
      }
      if (isHub && fog.natsMicroserviceUuid) {
        const { user: hubSysUser } = await NatsAuthServiceRuntime.ensureSysUserForServer({ isHub: true }, transaction)
        const credsSecretName = hubSysUser.credsSecretName
        await _ensureVolumeMount(credsSecretName, { secretName: credsSecretName }, transaction)
        await VolumeMountService.linkVolumeMountEndpoint(credsSecretName, [fog.uuid], transaction)
        await _ensureVolumeMapping(fog.natsMicroserviceUuid, credsSecretName, NATS_CREDS_DIR, 'ro', 'volumeMount', transaction)
      }
    } catch (error) {
      logger.error(`Failed to reconcile NATS artifacts for fog ${fog.uuid}: ${error.message}`)
    }
  }

  if (_isKubernetesControlPlane()) {
    try {
      const existing = await K8sClient.getConfigMap(K8S_NATS_JWT_BUNDLE_CONFIG_MAP, { ignoreNotFound: true })
      const existingData = existing && existing.data ? existing.data : null
      const newHash = _configMapDataHash(fullServerJwtBundle)
      const unchanged = existingData && _configMapDataHash(existingData) === newHash
      if (!unchanged) {
        await K8sClient.patchConfigMap(K8S_NATS_JWT_BUNDLE_CONFIG_MAP, { data: fullServerJwtBundle }, { ignoreNotFound: true })
      }
    } catch (err) {
      logger.warn(`Failed to patch Kubernetes NATS hub JWT bundle ConfigMap: ${err.message}`)
    }
  }
}

const REASON_VALUES = ['auth-mutation', 'account-created', 'account-deleted', 'account-rule-updated', 'user-rule-updated', 'server-deleted', 'cluster-routes-changed', 'system-account-created']

async function _computeAffectedFogUuidsForEnqueue (options, transaction) {
  const reason = options.reason || 'auth-mutation'
  const fogs = await FogManager.findAll({}, transaction)
  const applicationsWithNats = await ApplicationManager.findAll({ natsAccess: true }, transaction)
  const appIdsFromNatsApps = (applicationsWithNats || []).map((a) => a.id)
  const applicationsWithNatsById = new Map((applicationsWithNats || []).map((a) => [a.id, a]))
  const natsInstances = await NatsInstanceManager.findAll({}, transaction)
  const natsInstanceByFog = new Map()
  for (const ni of natsInstances || []) {
    if (ni.iofogUuid) natsInstanceByFog.set(ni.iofogUuid, ni)
  }
  const microservices = appIdsFromNatsApps.length > 0
    ? await MicroserviceManager.findAll({ applicationId: { [Op.in]: appIdsFromNatsApps } }, transaction)
    : []
  const microservicesByFog = new Map()
  for (const ms of microservices) {
    if (ms.iofogUuid) {
      if (!microservicesByFog.has(ms.iofogUuid)) microservicesByFog.set(ms.iofogUuid, [])
      microservicesByFog.get(ms.iofogUuid).push(ms)
    }
  }
  const fogUuids = fogs.map((f) => f.uuid)
  if (reason === 'server-deleted' || reason === 'cluster-routes-changed') {
    return []
  }
  if (reason === 'auth-mutation') {
    return fogUuids
  }
  if (reason === 'system-account-created') {
    const serverFogUuids = fogUuids.filter((uuid) => {
      const ni = natsInstanceByFog.get(uuid)
      return ni && !ni.isLeaf
    })
    return serverFogUuids
  }
  if ((reason === 'account-created' || reason === 'account-deleted') && options.applicationId != null) {
    const affected = _getAffectedFogUuidsForApplication(options.applicationId, natsInstanceByFog, microservicesByFog)
    return fogUuids.filter((u) => affected.has(u))
  }
  if (reason === 'account-rule-updated' && options.accountRuleId != null) {
    const affected = _getAffectedFogUuidsForAccountRule(options.accountRuleId, natsInstanceByFog, microservicesByFog, applicationsWithNatsById)
    return fogUuids.filter((u) => affected.has(u))
  }
  if (reason === 'user-rule-updated' && options.userRuleId != null) {
    const affected = await _getAffectedFogUuidsForUserRule(options.userRuleId, natsInstanceByFog, transaction)
    return fogUuids.filter((u) => affected.has(u))
  }
  return fogUuids
}

function _chunkFogUuids (fogUuids, chunkSize) {
  const chunks = []
  for (let i = 0; i < fogUuids.length; i += chunkSize) {
    chunks.push(fogUuids.slice(i, i + chunkSize))
  }
  return chunks.length ? chunks : [[]]
}

async function enqueueReconcileTask (options = {}, transaction) {
  if (transaction.fakeTransaction) {
    return databaseProvider.sequelize.transaction((t) => enqueueReconcileTask(options, t))
  }
  const reason = REASON_VALUES.includes(options.reason) ? options.reason : 'auth-mutation'
  const applicationId = options.applicationId != null ? options.applicationId : null
  const accountRuleId = options.accountRuleId != null ? options.accountRuleId : null
  const userRuleId = options.userRuleId != null ? options.userRuleId : null
  const scope = { reason, applicationId, accountRuleId, userRuleId }

  let affectedFogUuids
  if (Array.isArray(options.fogUuids) && options.fogUuids.length > 0) {
    affectedFogUuids = options.fogUuids
  } else {
    affectedFogUuids = await _computeAffectedFogUuidsForEnqueue({ ...options, reason }, transaction)
  }
  const chunkSize = Math.max(1, config.get('settings.natsReconcileChunkSize', 1))
  const chunks = _chunkFogUuids(affectedFogUuids, chunkSize)

  const Entity = NatsReconcileTaskManager.getEntity()
  await Entity.destroy({
    where: {
      reason: scope.reason,
      applicationId: scope.applicationId,
      accountRuleId: scope.accountRuleId,
      userRuleId: scope.userRuleId,
      status: { [Op.in]: ['pending', 'in_progress'] }
    },
    transaction
  })

  for (const chunk of chunks) {
    await NatsReconcileTaskManager.create({
      reason: scope.reason,
      applicationId: scope.applicationId,
      accountRuleId: scope.accountRuleId,
      userRuleId: scope.userRuleId,
      fogUuids: chunk.join(','),
      status: 'pending'
    }, transaction)
  }
}

async function claimNextTask (controllerUuid, stalenessSeconds) {
  return NatsReconcileTaskManager.claimNext(controllerUuid, stalenessSeconds)
}

async function reconcileResolverArtifacts (options = {}, transaction) {
  if (natsReconcileRunning) {
    natsReconcilePending = true
    return { scheduled: true }
  }

  natsReconcileRunning = true
  try {
    do {
      natsReconcilePending = false
      await _reconcileResolverArtifactsOnce(options, transaction)
    } while (natsReconcilePending)
    return { scheduled: false }
  } finally {
    natsReconcileRunning = false
  }
}

function isReconcileRunning () {
  return natsReconcileRunning
}

function setReconcilePending () {
  natsReconcilePending = true
}

function scheduleResolverArtifactsReconcile (options = {}) {
  if (natsReconcileRunning) {
    natsReconcilePending = true
    return { scheduled: true }
  }
  if (natsReconcileScheduled) {
    natsReconcilePending = true
    return { scheduled: true }
  }
  natsReconcileScheduled = true
  setImmediate(async () => {
    natsReconcileScheduled = false
    try {
      await module.exports.reconcileResolverArtifacts(options)
    } catch (error) {
      logger.error(`Background NATS reconcile failed: ${error.message}`)
    }
  })
  return { scheduled: true }
}

function normalizeJetstreamSize (value, defaultValue) {
  return _normalizeJetstreamSize(value, defaultValue)
}

module.exports = {
  ensureNatsForFog: TransactionDecorator.generateTransaction(ensureNatsForFog),
  reconcileResolverArtifacts: TransactionDecorator.generateTransaction(reconcileResolverArtifacts),
  scheduleResolverArtifactsReconcile: scheduleResolverArtifactsReconcile,
  enqueueReconcileTask: TransactionDecorator.generateTransaction(enqueueReconcileTask),
  claimNextTask,
  cleanupNatsForFog: TransactionDecorator.generateTransaction(cleanupNatsForFog),
  ensureLeafCredsForFog: TransactionDecorator.generateTransaction(ensureLeafCredsForFog),
  isReconcileRunning,
  setReconcilePending,
  normalizeJetstreamSize,
  mergeK8sHubClusterRoutes
}
