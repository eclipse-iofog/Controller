const { connect, credsAuthenticator } = require('@nats-io/transport-node')
const config = require('../config')
const logger = require('../logger')
const Constants = require('../helpers/constants')
const { createDedupeHostList, aggregateConnectError } = require('../helpers/connect-endpoint-utils')
const NatsInstanceManager = require('../data/managers/nats-instance-manager')
const NatsAccountManager = require('../data/managers/nats-account-manager')
const NatsUserManager = require('../data/managers/nats-user-manager')
const NatsAuthService = require('./nats-auth-service')
const SecretService = require('./secret-service')

const NATS_DEFAULT_PORT = 4222

class NatsRelayConnectionManager {
  constructor (deps = {}) {
    this._connectFn = deps.connectFn || connect
    this._config = deps.config || config
    this.maxReconnectAttempts = deps.maxReconnectAttempts ?? -1
    this.fakeTransaction = { fakeTransaction: true }
    this.connection = null
    this.connectionPromise = null
    this.cachedHubRecord = null
    this.cachedCreds = null
    this.credsPromise = null
    this.recoveryListeners = []
    this.statusTask = null
    this.shuttingDown = false
  }

  onReconnect (cb) {
    if (typeof cb === 'function') {
      this.recoveryListeners.push(cb)
    }
  }

  _notifyReconnect () {
    for (const listener of this.recoveryListeners) {
      try {
        listener()
      } catch (error) {
        logger.error({ error: error.message }, '[NATS][RELAY] Reconnect listener failed')
      }
    }
  }

  isConnected () {
    return !!(this.connection && !this.connection.isClosed())
  }

  async isAvailable () {
    if (this.isConnected()) {
      return true
    }
    try {
      await this.getConnection()
      return this.isConnected()
    } catch (error) {
      logger.debug({ error: error.message }, '[NATS][RELAY] Hub unavailable for relay')
      return false
    }
  }

  async getConnection () {
    if (this.shuttingDown) {
      throw new Error('NATS relay connection manager is shutting down')
    }
    if (this.connection && !this.connection.isClosed()) {
      return this.connection
    }
    if (this.connectionPromise) {
      return this.connectionPromise
    }

    this.connectionPromise = this._createConnection()
    return this.connectionPromise
  }

  async _createConnection () {
    try {
      const { hosts, port } = await this._resolveHubEndpoint()
      const creds = await this._loadControllerRelayCreds()
      const connectAttempts = []

      for (let attempt = 0; attempt < hosts.length; attempt++) {
        const host = hosts[attempt]
        const servers = `nats://${host}:${port}`
        try {
          const nc = await this._connectFn({
            servers,
            authenticator: credsAuthenticator(creds),
            maxReconnectAttempts: this.maxReconnectAttempts,
            reconnect: true,
            reconnectTimeWait: 1000,
            name: 'controller-ws-relay'
          })

          this.connection = nc
          this.connectionPromise = null
          this._watchConnectionStatus(nc)

          logger.info({
            host,
            port,
            attempt: attempt + 1,
            totalAttempts: hosts.length,
            controlPlane: this._isKubernetes() ? 'kubernetes' : 'remote'
          }, '[NATS][RELAY] Hub connection established')
          return nc
        } catch (error) {
          const errorMessage = error.message || String(error)
          connectAttempts.push({ host, error: errorMessage })
          logger.warn({
            host,
            port,
            attempt: attempt + 1,
            totalAttempts: hosts.length,
            error: errorMessage
          }, '[NATS][RELAY] Hub connect attempt failed')
        }
      }

      const aggregateError = aggregateConnectError(
        'Unable to connect NATS hub after all fallback hosts',
        connectAttempts,
        port
      )
      logger.error({
        hosts,
        port,
        connectAttempts,
        error: aggregateError.message
      }, '[NATS][RELAY] Unable to connect hub after all fallback hosts')
      throw aggregateError
    } catch (error) {
      this.connectionPromise = null
      throw error
    }
  }

  _watchConnectionStatus (nc) {
    if (this.statusTask) {
      return
    }

    this.statusTask = (async () => {
      try {
        for await (const status of nc.status()) {
          if (status.type === 'disconnect') {
            logger.warn({
              error: status.data ? status.data.message : undefined
            }, '[NATS][RELAY] Hub connection disconnected')
          } else if (status.type === 'reconnect') {
            logger.info('[NATS][RELAY] Hub connection reconnected')
            this._notifyReconnect()
          }
        }
      } catch (error) {
        if (!this.shuttingDown) {
          logger.debug({ error: error.message }, '[NATS][RELAY] Connection status watcher ended')
        }
      } finally {
        this.statusTask = null
      }
    })()
  }

  async _resolveHubEndpoint () {
    const hub = await this._getHubRecord()
    const port = hub.serverPort || NATS_DEFAULT_PORT
    const hosts = this._buildHubHostList(hub)
    return { hosts, port, hubUuid: hub.iofogUuid }
  }

  _buildHubHostList (hub) {
    if (this._isKubernetes()) {
      return this._kubernetesHubHosts(hub)
    }
    return this._remoteHubHosts(hub)
  }

  _kubernetesHubHosts (hub) {
    const { hosts, addHost } = createDedupeHostList()

    const namespace = process.env.CONTROLLER_NAMESPACE || this._config.get('app.namespace')
    if (namespace && namespace.trim().length > 0) {
      addHost(`${Constants.DEFAULT_NATS_K8S_SERVICE}.${namespace.trim()}.svc.cluster.local`)
    }
    if (hub.host) {
      addHost(hub.host)
    }
    if (hosts.length === 0) {
      addHost(Constants.DEFAULT_NATS_K8S_SERVICE)
    }
    return hosts
  }

  _remoteHubHosts (hub) {
    const { hosts, addHost } = createDedupeHostList()

    addHost(Constants.NATS_BRIDGE_DNS_SAN)

    if (hub.host) {
      addHost(hub.host)
    }

    return hosts
  }

  async _getHubRecord () {
    if (this.cachedHubRecord) {
      return this.cachedHubRecord
    }
    const hub = await NatsInstanceManager.findOne({ isHub: true }, this.fakeTransaction)
    if (!hub) {
      throw new Error('NATS hub not found. Ensure a hub NatsInstances row with isHub=true exists.')
    }
    this.cachedHubRecord = hub
    return hub
  }

  async _loadControllerRelayCreds () {
    if (this.cachedCreds) {
      return this.cachedCreds
    }
    if (this.credsPromise) {
      return this.credsPromise
    }

    this.credsPromise = (async () => {
      try {
        await this._ensureControllerNatsAccount()
        const creds = await this._fetchControllerRelayCreds()
        this.cachedCreds = creds
        return creds
      } finally {
        this.credsPromise = null
      }
    })()
    return this.credsPromise
  }

  async _ensureControllerNatsAccount () {
    const hub = await NatsInstanceManager.findOne({ isHub: true }, this.fakeTransaction)
    if (!hub) {
      return
    }
    await NatsAuthService.ensureControllerNatsAccount()
  }

  async _fetchControllerRelayCreds () {
    const account = await NatsAccountManager.findOne({
      name: NatsAuthService.CONTROLLER_NATS_ACCOUNT_NAME,
      applicationId: null,
      isSystem: false,
      isLeafSystem: false
    }, this.fakeTransaction)

    let credsSecretName = NatsAuthService.controllerNatsCredsSecretName()
    if (account) {
      const user = await NatsUserManager.findOne({
        accountId: account.id,
        name: NatsAuthService.CONTROLLER_NATS_USER_NAME
      }, this.fakeTransaction)
      if (user && user.credsSecretName) {
        credsSecretName = user.credsSecretName
      }
    }

    const secret = await this._safeGetSecret(credsSecretName)
    if (!secret || !secret.data) {
      throw new Error(`Controller relay NATS creds secret not found: ${credsSecretName}`)
    }

    const credsKey = Object.keys(secret.data).find((key) => key.endsWith('.creds')) || 'creds'
    const raw = secret.data[credsKey]
    if (!raw) {
      throw new Error(`Missing creds payload in secret ${credsSecretName}`)
    }

    const credsText = typeof raw === 'string'
      ? raw
      : Buffer.from(raw, 'base64').toString('utf8')

    return new TextEncoder().encode(credsText)
  }

  async _safeGetSecret (name) {
    try {
      return await SecretService.getSecretEndpoint(name)
    } catch (error) {
      if (error.name === 'NotFoundError') {
        logger.debug({ secret: name }, '[NATS][RELAY] Secret not found')
        return null
      }
      throw error
    }
  }

  _isKubernetes () {
    const controlPlane = process.env.CONTROL_PLANE || this._config.get('app.ControlPlane')
    return controlPlane && controlPlane.toLowerCase() === 'kubernetes'
  }

  async shutdown () {
    this.shuttingDown = true
    if (this.connection && !this.connection.isClosed()) {
      try {
        await this.connection.drain()
      } catch (error) {
        logger.debug({ error: error.message }, '[NATS][RELAY] Drain failed during shutdown')
        try {
          await this.connection.close()
        } catch (closeError) {
          logger.debug({ error: closeError.message }, '[NATS][RELAY] Close failed during shutdown')
        }
      }
    }
    this.connection = null
    this.connectionPromise = null
    logger.info('[NATS][RELAY] Connection manager shut down')
  }

  resetForTests () {
    this.connection = null
    this.connectionPromise = null
    this.cachedHubRecord = null
    this.cachedCreds = null
    this.credsPromise = null
    this.statusTask = null
    this.shuttingDown = false
    this.recoveryListeners = []
  }
}

module.exports = new NatsRelayConnectionManager()
module.exports.NatsRelayConnectionManager = NatsRelayConnectionManager
