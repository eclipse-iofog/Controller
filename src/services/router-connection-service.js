const rhea = require('rhea')
const config = require('../config')
const logger = require('../logger')
const Constants = require('../helpers/constants')
const RouterManager = require('../data/managers/router-manager')
const CertificateService = require('./certificate-service')
const SecretService = require('./secret-service')
const os = require('os')

const CONTROLLER_CERT_PREFIX = 'controller-exec-session-client'
const hostname = process.env.HOSTNAME || os.hostname()
const CONTROLLER_CERT_NAME = hostname ? `${CONTROLLER_CERT_PREFIX}-${hostname}` : CONTROLLER_CERT_PREFIX

const DEFAULT_ROUTER_SERVICE = 'router'
const AMQP_DEFAULT_PORT = 5671

class RouterConnectionService {
  constructor () {
    this.connection = null
    this.connectionPromise = null
    this.certificatePromise = null
    this.cachedCertificate = null
    this.connectionOptions = null
    this.cachedRouterRecord = null
    this.fakeTransaction = { fakeTransaction: true }
    this.container = rhea.create_container({
      id: 'controller-exec-session-client',
      enable_sasl_external: true
    })
  }

  async getConnection () {
    if (this.connection && this.connection.is_open && this.connection.is_open()) {
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
      logger.debug({ msg: '[AMQP] Preparing router connection options' })

      const { hosts, port } = await this._resolveRouterEndpoint()
      logger.debug({ msg: '[AMQP] Router endpoint resolved', hosts, port })
      const certBundle = await this._ensureControllerCertificate()

      let lastError = null
      for (let attempt = 0; attempt < hosts.length; attempt++) {
        const host = hosts[attempt]
        const options = this._buildConnectOptions(host, port, certBundle)
        try {
          const connection = await this._connectToHost(host, port, options)
          this.connectionOptions = {
            transport: 'tls',
            host,
            hostname: host,
            port,
            rejectUnauthorized: true,
            idle_time_out: 300000,
            reconnect: true,
            reconnect_limit: 100,
            username: '',
            password: '',
            container_id: 'controller-exec-session-client'
          }
          this.cachedCertificate = certBundle
          logger.info({
            msg: '[AMQP] Router connection established',
            host,
            port,
            attempt: attempt + 1,
            totalAttempts: hosts.length
          })
          return connection
        } catch (error) {
          lastError = error
          logger.warn({
            msg: '[AMQP] Router connect attempt failed',
            host,
            port,
            attempt: attempt + 1,
            totalAttempts: hosts.length,
            err: error.message || String(error)
          })
        }
      }

      const aggregateError = lastError || new Error('No router hosts available for connection')
      logger.error({
        err: aggregateError,
        transport: 'amqp',
        msg: '[AMQP] Unable to connect to router after all fallback hosts',
        hosts,
        port
      })
      throw aggregateError
    } catch (error) {
      this.connectionPromise = null
      logger.error('[AMQP] Failed to create router connection', {
        error: error.message,
        stack: error.stack
      })
      throw error
    }
  }

  _buildConnectOptions (host, port, certBundle) {
    logger.debug({ msg: '[AMQP] Router connection options built', host, port })
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
      container_id: 'controller-exec-session-client',
      cert: certBundle.cert,
      key: certBundle.key,
      ca: [certBundle.ca]
    }
  }

  _connectToHost (host, port, options) {
    return new Promise((resolve, reject) => {
      const connection = this.container.connect(options)
      let settled = false

      const settle = (handler) => (context) => {
        if (settled) return
        settled = true
        handler(context)
      }

      const cleanupPromise = () => {
        this.connection = null
        this.connectionPromise = null
      }

      connection.once('connection_open', settle(() => {
        this.connection = connection
        this.connectionPromise = null
        connection.on('connection_error', (context) => {
          logger.error({
            err: context.error,
            transport: 'amqp',
            msg: '[AMQP] Connection error event',
            host,
            port
          })
        })
        connection.on('connection_close', () => {
          logger.warn('[AMQP] Router connection closed', { host, port })
          cleanupPromise()
        })
        connection.on('disconnected', (context) => {
          logger.warn('[AMQP] Router connection disconnected', {
            host,
            port,
            error: context.error ? context.error.message : 'unknown'
          })
          cleanupPromise()
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
      return [this._kubernetesRouterHost(router)]
    }
    return this._remoteRouterHosts(router)
  }

  _kubernetesRouterHost (router) {
    const namespace = process.env.CONTROLLER_NAMESPACE || config.get('app.namespace')
    if (namespace && namespace.trim().length > 0) {
      return `${DEFAULT_ROUTER_SERVICE}.${namespace.trim()}.svc.cluster.local`
    }
    const dbHost = router.host && router.host.trim().length > 0 ? router.host.trim() : ''
    return dbHost || DEFAULT_ROUTER_SERVICE
  }

  _remoteRouterHosts (router) {
    const hosts = []
    const seen = new Set()
    const addHost = (candidate) => {
      if (!candidate) return
      const trimmed = String(candidate).trim()
      if (trimmed.length === 0 || seen.has(trimmed)) return
      seen.add(trimmed)
      hosts.push(trimmed)
    }

    addHost(Constants.ROUTER_BRIDGE_DNS_SAN)

    if (router.host) {
      addHost(router.host)
    }

    const namespace = process.env.CONTROLLER_NAMESPACE || config.get('app.namespace')
    if (namespace && namespace.trim().length > 0) {
      addHost(`${DEFAULT_ROUTER_SERVICE}.${namespace.trim()}.svc.cluster.local`)
    }

    return hosts
  }

  async _getDefaultRouterRecord () {
    if (this.cachedRouterRecord) {
      return this.cachedRouterRecord
    }
    const router = await RouterManager.findOne({ isDefault: true }, this.fakeTransaction)
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
    await CertificateService.ensureRouterLocalCA(this.fakeTransaction)
    const existingSecret = await this._safeGetSecret(CONTROLLER_CERT_NAME)
    const caName = Constants.DEFAULT_ROUTER_LOCAL_CA
    if (existingSecret) {
      const caSecret = await this._safeGetSecret(caName)
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
        expiration: 36 // months
      })
    } catch (error) {
      logger.error({ err: error, ca: caName, msg: '[AMQP] Failed to create controller certificate' })
      throw error
    }

    const certSecret = await this._safeGetSecret(CONTROLLER_CERT_NAME)
    const caSecret = await this._safeGetSecret(caName)
    if (!certSecret || !caSecret) {
      throw new Error('Controller certificate creation succeeded but secret not found')
    }
    logger.debug({ msg: '[AMQP] controller-exec-session-client certificate generated successfully', ca: caName })
    return this._decodeCertificate(certSecret, caSecret)
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

  async _safeGetSecret (name) {
    try {
      return await SecretService.getSecretEndpoint(name)
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

module.exports = new RouterConnectionService()
