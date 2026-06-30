const rhea = require('rhea')
const config = require('../config')
const logger = require('../logger')
const Constants = require('../helpers/constants')
const { createDedupeHostList, aggregateConnectError } = require('../helpers/connect-endpoint-utils')
const RouterManager = require('../data/managers/router-manager')
const CertificateService = require('./certificate-service')
const SecretService = require('./secret-service')
const os = require('os')
const { runInTransaction } = require('../helpers/transaction-runner')

const CONTROLLER_CERT_PREFIX = 'controller-exec-session-client'
const hostname = process.env.HOSTNAME || os.hostname()
const CONTROLLER_CERT_NAME = hostname ? `${CONTROLLER_CERT_PREFIX}-${hostname}` : CONTROLLER_CERT_PREFIX

const AMQP_DEFAULT_PORT = 5671
const RELAY_CONTAINER_PREFIX = 'controller-relay'

function hashSessionId (sessionId) {
  let hash = 5381
  const value = String(sessionId)
  for (let i = 0; i < value.length; i++) {
    hash = ((hash << 5) + hash) ^ value.charCodeAt(i)
  }
  return Math.abs(hash >>> 0)
}

function isCircularBufferOverflow (error) {
  const msg = error && error.message ? error.message : String(error)
  return /circular buffer overflow/i.test(msg)
}

function isTlsError (error) {
  if (!error) return false
  const msg = error.message ? error.message : String(error)
  return /tls|certificate|cert|ssl|handshake/i.test(msg)
}

class PoolSlot {
  constructor (manager, slotId) {
    this.manager = manager
    this.slotId = slotId
    this.containerId = `${RELAY_CONTAINER_PREFIX}-${hostname || 'local'}-${slotId}`
    this.container = rhea.create_container({
      id: this.containerId,
      enable_sasl_external: true
    })
    this.connection = null
    this.connectionPromise = null
    this.healthy = true
    this.unsettledCount = 0
  }
}

class RouterConnectionManager {
  constructor () {
    this.poolSize = config.get('server.webSocket.relay.amqp.poolSize', 8)
    this.sendTimeoutMs = config.get('server.webSocket.relay.amqp.sendTimeoutMs', 5000)
    this.unsettledWarnThreshold = config.get('server.webSocket.relay.amqp.unsettledWarnThreshold', 1800)
    this.certificatePromise = null
    this.cachedCertificate = null
    this.cachedRouterRecord = null
    this.slots = Array.from({ length: this.poolSize }, (_, slotId) => new PoolSlot(this, slotId))
    this.recoveryListeners = []
    this.saturationCount = 0
    this.shuttingDown = false
  }

  slotIdForSession (sessionId) {
    return hashSessionId(sessionId) % this.poolSize
  }

  async acquire (sessionId) {
    if (this.shuttingDown) {
      throw new Error('Router connection pool is shutting down')
    }
    const slotId = this.slotIdForSession(sessionId)
    return this._getSlotConnection(slotId)
  }

  async getConnection () {
    return this.acquire('__legacy__')
  }

  getSlot (slotId) {
    return this.slots[slotId]
  }

  isConnected () {
    return this.slots.some((slot) => slot.connection && slot.connection.is_open && slot.connection.is_open())
  }

  getHealthyPoolCount () {
    return this.slots.filter((slot) =>
      slot.healthy &&
      slot.connection &&
      slot.connection.is_open &&
      slot.connection.is_open()
    ).length
  }

  getTotalUnsettled () {
    return this.slots.reduce((sum, slot) => sum + (slot.unsettledCount || 0), 0)
  }

  recordSessionSaturation () {
    this.saturationCount += 1
  }

  getSaturationCount () {
    return this.saturationCount
  }

  onSlotRecovery (cb) {
    if (typeof cb === 'function') {
      this.recoveryListeners.push(cb)
    }
  }

  _notifySlotRecovery (slotId) {
    for (const listener of this.recoveryListeners) {
      try {
        listener(slotId)
      } catch (error) {
        logger.error('[AMQP] Slot recovery listener failed', {
          slotId,
          error: error.message
        })
      }
    }
  }

  async isRouterAvailable () {
    if (this.isConnected()) {
      return true
    }
    try {
      await this.acquire('__healthcheck__')
      return this.isConnected()
    } catch (error) {
      return false
    }
  }

  async waitForSendable (sender, timeoutMs = this.sendTimeoutMs) {
    if (!sender) {
      throw new Error('AMQP sender is missing')
    }
    if (typeof sender.sendable === 'function' && sender.sendable()) {
      return
    }

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        cleanup()
        reject(new Error(`AMQP sender not sendable within ${timeoutMs}ms`))
      }, timeoutMs)

      const onSendable = () => {
        cleanup()
        resolve()
      }

      const onError = (context) => {
        cleanup()
        reject(context.error || new Error('AMQP sender error while waiting for sendable'))
      }

      const cleanup = () => {
        clearTimeout(timer)
        sender.removeListener('sendable', onSendable)
        sender.removeListener('error', onError)
      }

      sender.once('sendable', onSendable)
      sender.once('error', onError)
    })
  }

  async markSlotUnhealthy (slotId, reason) {
    const slot = this.slots[slotId]
    if (!slot) return

    slot.healthy = false
    this.recordSessionSaturation()
    logger.warn('[AMQP] Marking router pool slot unhealthy', {
      slotId,
      containerId: slot.containerId,
      reason: reason || 'unknown'
    })

    await this.reconnectSlot(slotId)
  }

  async reconnectSlot (slotId) {
    const slot = this.slots[slotId]
    if (!slot || this.shuttingDown) return

    this._closeSlotConnection(slot)

    try {
      await this._createSlotConnection(slot)
      slot.healthy = true
      logger.info('[AMQP] Router pool slot reconnected', {
        slotId,
        containerId: slot.containerId
      })
      this._notifySlotRecovery(slotId)
    } catch (error) {
      slot.healthy = false
      logger.error('[AMQP] Router pool slot reconnect failed', {
        slotId,
        containerId: slot.containerId,
        error: error.message
      })
      throw error
    }
  }

  handleSendError (sessionId, error) {
    if (isCircularBufferOverflow(error)) {
      const slotId = this.slotIdForSession(sessionId)
      this.markSlotUnhealthy(slotId, error.message).catch((reconnectError) => {
        logger.error('[AMQP] Failed to recover slot after overflow', {
          slotId,
          error: reconnectError.message
        })
      })
      return true
    }
    return false
  }

  updateUnsettledCount (slotId, count) {
    const slot = this.slots[slotId]
    if (!slot) return
    slot.unsettledCount = count
    if (count >= this.unsettledWarnThreshold) {
      logger.warn('[AMQP] Router pool slot unsettled deliveries high', {
        slotId,
        unsettled: count,
        threshold: this.unsettledWarnThreshold
      })
    }
  }

  async _getSlotConnection (slotId) {
    const slot = this.slots[slotId]
    if (!slot) {
      throw new Error(`Invalid router pool slot: ${slotId}`)
    }

    if (slot.connection && slot.connection.is_open && slot.connection.is_open() && slot.healthy) {
      return slot.connection
    }

    if (slot.connectionPromise) {
      return slot.connectionPromise
    }

    slot.connectionPromise = this._createSlotConnection(slot)
    return slot.connectionPromise
  }

  async _createSlotConnection (slot) {
    try {
      const { hosts, port } = await this._resolveRouterEndpoint()
      const certBundle = await this._ensureControllerCertificate()

      const connectAttempts = []
      for (let attempt = 0; attempt < hosts.length; attempt++) {
        const host = hosts[attempt]
        const options = this._buildConnectOptions(host, port, certBundle, slot.containerId)
        try {
          const connection = await this._connectToHost(slot, host, port, options)
          this.cachedCertificate = certBundle
          logger.info({
            slotId: slot.slotId,
            containerId: slot.containerId,
            host,
            port,
            attempt: attempt + 1,
            totalAttempts: hosts.length
          }, '[AMQP] Router pool slot connection established')
          return connection
        } catch (error) {
          const errorMessage = error.message || String(error)
          connectAttempts.push({ host, error: errorMessage })
          logger.warn({
            slotId: slot.slotId,
            host,
            port,
            attempt: attempt + 1,
            totalAttempts: hosts.length,
            error: errorMessage
          }, '[AMQP] Router pool slot connect attempt failed')
        }
      }

      const aggregateError = aggregateConnectError(
        'Unable to connect router pool slot after all fallback hosts',
        connectAttempts,
        port
      )
      logger.error({
        transport: 'amqp',
        slotId: slot.slotId,
        hosts,
        port,
        connectAttempts,
        error: aggregateError.message
      }, '[AMQP] Unable to connect router pool slot after all fallback hosts')
      throw aggregateError
    } catch (error) {
      slot.connectionPromise = null
      throw error
    }
  }

  _buildConnectOptions (host, port, certBundle, containerId) {
    return {
      transport: 'tls',
      host,
      hostname: host,
      port,
      rejectUnauthorized: true,
      idle_time_out: 300000,
      reconnect: false,
      username: '',
      password: '',
      container_id: containerId,
      cert: certBundle.cert,
      key: certBundle.key,
      ca: [certBundle.ca]
    }
  }

  _connectToHost (slot, host, port, options) {
    return new Promise((resolve, reject) => {
      const connection = slot.container.connect(options)
      let settled = false

      const settle = (handler) => (context) => {
        if (settled) return
        settled = true
        handler(context)
      }

      const cleanupPromise = () => {
        slot.connection = null
        slot.connectionPromise = null
        slot.healthy = false
      }

      connection.once('connection_open', settle(() => {
        slot.connection = connection
        slot.connectionPromise = null
        slot.healthy = true

        connection.on('connection_error', (context) => {
          logger.error({
            err: context.error,
            transport: 'amqp',
            msg: '[AMQP] Pool slot connection error event',
            slotId: slot.slotId,
            host,
            port
          })
          if (isTlsError(context.error)) {
            this.cachedCertificate = null
            this.reconnectSlot(slot.slotId).catch((error) => {
              logger.error('[AMQP] TLS reconnect failed for pool slot', {
                slotId: slot.slotId,
                error: error.message
              })
            })
          }
        })

        connection.on('connection_close', () => {
          logger.warn('[AMQP] Router pool slot connection closed', {
            slotId: slot.slotId,
            host,
            port
          })
          cleanupPromise()
        })

        connection.on('disconnected', (context) => {
          logger.warn('[AMQP] Router pool slot disconnected', {
            slotId: slot.slotId,
            host,
            port,
            error: context.error ? context.error.message : 'unknown'
          })
          cleanupPromise()
          if (context.error && isTlsError(context.error)) {
            this.cachedCertificate = null
          }
        })

        resolve(connection)
      }))

      connection.once('connection_close', settle((context) => {
        reject(context.error || new Error('Router connection closed before opening'))
      }))

      connection.once('disconnected', settle((context) => {
        reject(context.error || new Error('Router disconnected during connect'))
      }))
    })
  }

  _closeSlotConnection (slot) {
    if (!slot.connection) return
    try {
      slot.connection.removeAllListeners()
      slot.connection.close()
    } catch (error) {
      logger.debug('[AMQP] Failed to close pool slot connection during reconnect', {
        slotId: slot.slotId,
        error: error.message
      })
    }
    slot.connection = null
    slot.connectionPromise = null
  }

  async shutdown () {
    this.shuttingDown = true
    for (const slot of this.slots) {
      this._closeSlotConnection(slot)
    }
    logger.info('[AMQP] Router connection pool shut down', { poolSize: this.poolSize })
  }

  async _resolveRouterEndpoint () {
    logger.debug({ msg: '[AMQP] Resolving default router endpoint' })
    try {
      const router = await this._getDefaultRouterRecord()
      const port = router.messagingPort || AMQP_DEFAULT_PORT
      const hosts = this._buildRouterHostList(router)
      const host = hosts[0]
      logger.debug({
        msg: '[AMQP] Default router resolved',
        routerHost: router.host,
        hosts,
        host,
        port,
        routerUuid: router.iofogUuid,
        controlPlane: this._isKubernetes() ? 'kubernetes' : 'remote'
      })
      return {
        host,
        hosts,
        port,
        routerUuid: router.iofogUuid
      }
    } catch (error) {
      logger.error({ err: error, msg: '[AMQP] Failed while resolving router endpoint' })
      throw error
    }
  }

  _buildRouterHostList (router) {
    if (this._isKubernetes()) {
      return this._kubernetesRouterHosts(router)
    }
    return this._remoteRouterHosts(router)
  }

  _kubernetesRouterHosts (router) {
    const { hosts, addHost } = createDedupeHostList()

    const namespace = process.env.CONTROLLER_NAMESPACE || config.get('app.namespace')
    if (namespace && namespace.trim().length > 0) {
      addHost(`${Constants.DEFAULT_ROUTER_K8S_SERVICE}.${namespace.trim()}.svc.cluster.local`)
    }
    if (router.host) {
      addHost(router.host)
    }
    if (hosts.length === 0) {
      addHost(Constants.DEFAULT_ROUTER_K8S_SERVICE)
    }
    return hosts
  }

  _remoteRouterHosts (router) {
    const { hosts, addHost } = createDedupeHostList()

    addHost(Constants.ROUTER_BRIDGE_DNS_SAN)

    if (router.host) {
      addHost(router.host)
    }

    return hosts
  }

  async _getDefaultRouterRecord () {
    if (this.cachedRouterRecord) {
      return this.cachedRouterRecord
    }
    const router = await runInTransaction(
      (transaction) => RouterManager.findOne({ isDefault: true }, transaction),
      { label: 'router-connection-default-router' }
    )
    if (!router) {
      throw new Error('Default router not found. Please ensure default router is provisioned.')
    }
    this.cachedRouterRecord = router
    return router
  }

  _isKubernetes () {
    const controlPlane = process.env.CONTROL_PLANE || config.get('app.ControlPlane')
    return controlPlane && controlPlane.toLowerCase() === 'kubernetes'
  }

  async _ensureControllerCertificate () {
    if (this.cachedCertificate) {
      return this.cachedCertificate
    }
    if (this.certificatePromise) {
      return this.certificatePromise
    }
    this.certificatePromise = (async () => {
      try {
        const bundle = await this._createControllerCertificate()
        this.cachedCertificate = bundle
        return bundle
      } finally {
        this.certificatePromise = null
      }
    })()
    return this.certificatePromise
  }

  async _createControllerCertificate () {
    logger.debug('[AMQP] Ensuring controller certificate secret exists', { name: CONTROLLER_CERT_NAME })
    const caName = Constants.DEFAULT_ROUTER_LOCAL_CA

    return runInTransaction(async (transaction) => {
      await CertificateService.ensureRouterLocalCA(transaction)

      const existingSecret = await this._safeGetSecret(CONTROLLER_CERT_NAME, transaction)
      if (existingSecret) {
        const caSecret = await this._safeGetSecret(caName, transaction)
        const bundle = this._decodeCertificate(existingSecret, caSecret)
        logger.debug({ msg: '[AMQP] Using existing controller-exec-session-client certificate', ca: caName })
        return bundle
      }

      const hosts = this._buildControllerHosts()
      logger.debug({ msg: '[AMQP] Generating controller-exec-session-client certificate', hosts, ca: caName })

      try {
        await CertificateService.createCertificateEndpoint({
          name: CONTROLLER_CERT_NAME,
          subject: CONTROLLER_CERT_NAME,
          hosts: hosts.join(','),
          ca: {
            type: 'direct',
            secretName: caName
          },
          expiration: 36
        }, transaction)
      } catch (error) {
        logger.error({ err: error, ca: caName, msg: '[AMQP] Failed to create controller certificate' })
        throw error
      }

      const certSecret = await this._safeGetSecret(CONTROLLER_CERT_NAME, transaction)
      const caSecret = await this._safeGetSecret(caName, transaction)
      if (!certSecret || !caSecret) {
        throw new Error('Controller certificate creation succeeded but secret not found')
      }
      logger.debug({ msg: '[AMQP] controller-exec-session-client certificate generated successfully', ca: caName })
      return this._decodeCertificate(certSecret, caSecret)
    }, { label: 'router-connection-controller-cert' })
  }

  _buildControllerHosts () {
    const hosts = new Set(['localhost', '127.0.0.1'])
    if (hostname) hosts.add(hostname)
    if (this._isKubernetes() && (process.env.CONTROLLER_NAMESPACE != null && process.env.CONTROLLER_NAMESPACE !== '')) {
      hosts.add(`controller.${process.env.CONTROLLER_NAMESPACE}.svc.cluster.local`)
    }
    if (process.env.CONTROLLER_HOST) hosts.add(process.env.CONTROLLER_HOST)
    return Array.from(hosts)
  }

  _decodeCertificate (certSecret, caSecret) {
    if (!certSecret || !certSecret.data) {
      throw new Error(`Secret ${CONTROLLER_CERT_NAME} is empty or missing.`)
    }
    if (!caSecret || !caSecret.data) {
      throw new Error('CA secret not found for router connection.')
    }
    const decode = (value, label) => {
      if (!value) {
        throw new Error(`Missing ${label} in certificate secret`)
      }
      return Buffer.from(value, 'base64')
    }
    return {
      cert: decode(certSecret.data['tls.crt'], 'tls.crt'),
      key: decode(certSecret.data['tls.key'], 'tls.key'),
      ca: decode(caSecret.data['tls.crt'], 'ca.crt')
    }
  }

  async _safeGetSecret (name, transaction) {
    try {
      return await SecretService.getSecretEndpoint(name, transaction)
    } catch (error) {
      if (error.name === 'NotFoundError') {
        logger.debug('[AMQP] Secret not found', { secret: name })
        return null
      }
      logger.error('[AMQP] Unexpected error while fetching secret', {
        secret: name,
        error: error.message,
        stack: error.stack
      })
      throw error
    }
  }
}

module.exports = new RouterConnectionManager()
