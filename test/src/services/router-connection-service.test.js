const { expect } = require('chai')
const sinon = require('sinon')

const Constants = require('../../../src/helpers/constants')
const config = require('../../../src/config')
const RouterManager = require('../../../src/data/managers/router-manager')
const CertificateService = require('../../../src/services/certificate-service')
const SecretService = require('../../../src/services/secret-service')
const RouterConnectionManager = require('../../../src/services/router-connection-manager')

describe('Router Connection Manager', () => {
  def('sandbox', () => sinon.createSandbox())

  const defaultRouter = {
    host: 'router-db.example.com',
    messagingPort: 5671,
    iofogUuid: 'default-router-uuid'
  }

  const originalControlPlane = process.env.CONTROL_PLANE
  const originalNamespace = process.env.CONTROLLER_NAMESPACE

  beforeEach(() => {
    for (const slot of RouterConnectionManager.slots) {
      slot.connection = null
      slot.connectionPromise = null
      slot.healthy = true
      slot.unsettledCount = 0
    }
    RouterConnectionManager.cachedRouterRecord = null
    RouterConnectionManager.cachedCertificate = null
    RouterConnectionManager.certificatePromise = null
    RouterConnectionManager.shuttingDown = false
    RouterConnectionManager.saturationCount = 0

    $sandbox.stub(RouterManager, 'findOne').resolves(defaultRouter)
  })

  afterEach(() => {
    $sandbox.restore()

    if (originalControlPlane === undefined) {
      delete process.env.CONTROL_PLANE
    } else {
      process.env.CONTROL_PLANE = originalControlPlane
    }

    if (originalNamespace === undefined) {
      delete process.env.CONTROLLER_NAMESPACE
    } else {
      process.env.CONTROLLER_NAMESPACE = originalNamespace
    }
  })

  describe('pool acquire — sticky assignment', () => {
    it('maps the same sessionId to the same slot', () => {
      const sessionId = 'exec-session-sticky-abc'
      const first = RouterConnectionManager.slotIdForSession(sessionId)
      const second = RouterConnectionManager.slotIdForSession(sessionId)
      expect(first).to.equal(second)
      expect(first).to.be.at.least(0).and.below(RouterConnectionManager.poolSize)
    })

    it('distributes different sessionIds across the pool range', () => {
      const slots = new Set()
      for (let i = 0; i < 64; i++) {
        slots.add(RouterConnectionManager.slotIdForSession(`session-${i}`))
      }
      expect(slots.size).to.be.at.least(2)
    })
  })

  describe('_resolveRouterEndpoint() — Kubernetes control plane', () => {
    beforeEach(() => {
      process.env.CONTROL_PLANE = 'kubernetes'
      process.env.CONTROLLER_NAMESPACE = 'iofog'
    })

    it('returns cluster service host then DB host fallback', async () => {
      const result = await RouterConnectionManager._resolveRouterEndpoint()

      expect(result.hosts).to.deep.equal([
        'router.iofog.svc.cluster.local',
        defaultRouter.host
      ])
      expect(result.host).to.equal('router.iofog.svc.cluster.local')
      expect(result.port).to.equal(5671)
      expect(result.routerUuid).to.equal(defaultRouter.iofogUuid)
    })

    it('does not include bridge DNS in the fallback list', async () => {
      const result = await RouterConnectionManager._resolveRouterEndpoint()

      expect(result.hosts).to.not.include(Constants.ROUTER_BRIDGE_DNS_SAN)
    })

    it('falls back to DB host when namespace is unset', async () => {
      delete process.env.CONTROLLER_NAMESPACE
      $sandbox.stub(config, 'get').withArgs('app.namespace').returns('')

      const result = await RouterConnectionManager._resolveRouterEndpoint()

      expect(result.hosts).to.deep.equal([defaultRouter.host])
    })

    it('falls back to default router service name when namespace and DB host are unset', async () => {
      delete process.env.CONTROLLER_NAMESPACE
      $sandbox.stub(config, 'get').withArgs('app.namespace').returns('')
      RouterManager.findOne.resolves({
        ...defaultRouter,
        host: ''
      })

      const result = await RouterConnectionManager._resolveRouterEndpoint()

      expect(result.hosts).to.deep.equal(['router'])
    })
  })

  describe('_resolveRouterEndpoint() — Remote control plane', () => {
    beforeEach(() => {
      process.env.CONTROL_PLANE = 'remote'
      process.env.CONTROLLER_NAMESPACE = 'edge-ns'
    })

    it('returns ordered fallback hosts: bridge DNS then DB host', async () => {
      const result = await RouterConnectionManager._resolveRouterEndpoint()

      expect(result.hosts).to.deep.equal([
        Constants.ROUTER_BRIDGE_DNS_SAN,
        defaultRouter.host
      ])
      expect(result.host).to.equal(Constants.ROUTER_BRIDGE_DNS_SAN)
      expect(result.port).to.equal(5671)
    })

    it('deduplicates hosts when DB host matches bridge DNS', async () => {
      RouterManager.findOne.resolves({
        ...defaultRouter,
        host: Constants.ROUTER_BRIDGE_DNS_SAN
      })

      const result = await RouterConnectionManager._resolveRouterEndpoint()

      expect(result.hosts).to.deep.equal([
        Constants.ROUTER_BRIDGE_DNS_SAN
      ])
    })

    it('omits cluster.local host when namespace is unset', async () => {
      delete process.env.CONTROLLER_NAMESPACE
      $sandbox.stub(config, 'get').withArgs('app.namespace').returns('')

      const result = await RouterConnectionManager._resolveRouterEndpoint()

      expect(result.hosts).to.deep.equal([
        Constants.ROUTER_BRIDGE_DNS_SAN,
        defaultRouter.host
      ])
    })

    it('uses default AMQP port when router messagingPort is unset', async () => {
      RouterManager.findOne.resolves({
        ...defaultRouter,
        messagingPort: null
      })

      const result = await RouterConnectionManager._resolveRouterEndpoint()

      expect(result.port).to.equal(5671)
    })
  })

  describe('_createControllerCertificate()', () => {
    const certSecret = {
      data: {
        'tls.crt': Buffer.from('cert-pem').toString('base64'),
        'tls.key': Buffer.from('key-pem').toString('base64'),
        'ca.crt': Buffer.from('ca-pem').toString('base64')
      }
    }
    const caSecret = {
      data: {
        'tls.crt': Buffer.from('ca-pem').toString('base64')
      }
    }

    beforeEach(() => {
      $sandbox.stub(CertificateService, 'ensureRouterLocalCA').resolves()
      $sandbox.stub(SecretService, 'getSecretEndpoint')
        .onFirstCall().resolves(null)
        .onSecondCall().resolves(certSecret)
        .onThirdCall().resolves(caSecret)
      $sandbox.stub(CertificateService, 'createCertificateEndpoint').resolves()
    })

    it('ensures default-router-local-ca before creating the exec client certificate', async () => {
      await RouterConnectionManager._createControllerCertificate()

      expect(CertificateService.ensureRouterLocalCA).to.have.been.calledOnce
      expect(CertificateService.createCertificateEndpoint).to.have.been.calledOnce
      expect(CertificateService.createCertificateEndpoint.firstCall.args[0].ca).to.deep.equal({
        type: 'direct',
        secretName: Constants.DEFAULT_ROUTER_LOCAL_CA
      })
    })
  })

  describe('_createSlotConnection() — Remote connect fallback', () => {
    const certBundle = {
      cert: Buffer.from('cert'),
      key: Buffer.from('key'),
      ca: Buffer.from('ca')
    }

    def('mockConnection', () => ({ is_open: () => true }))

    beforeEach(() => {
      $sandbox.stub(RouterConnectionManager, '_ensureControllerCertificate').resolves(certBundle)
    })

    it('tries hosts in order until one connects', async () => {
      const hosts = [Constants.ROUTER_BRIDGE_DNS_SAN, defaultRouter.host]
      $sandbox.stub(RouterConnectionManager, '_resolveRouterEndpoint').resolves({ hosts, port: 5671 })
      const connectStub = $sandbox.stub(RouterConnectionManager, '_connectToHost')
        .onCall(0).rejects(new Error('ECONNREFUSED'))
        .onCall(1).resolves($mockConnection)

      const slot = RouterConnectionManager.slots[0]
      const connection = await RouterConnectionManager._createSlotConnection(slot)

      expect(connection).to.equal($mockConnection)
      expect(connectStub).to.have.been.calledTwice
      expect(connectStub.firstCall.args[1]).to.equal(Constants.ROUTER_BRIDGE_DNS_SAN)
      expect(connectStub.secondCall.args[1]).to.equal(defaultRouter.host)
    })

    it('throws aggregate error after all hosts fail', async () => {
      const hosts = [Constants.ROUTER_BRIDGE_DNS_SAN, defaultRouter.host]
      $sandbox.stub(RouterConnectionManager, '_resolveRouterEndpoint').resolves({ hosts, port: 5671 })
      $sandbox.stub(RouterConnectionManager, '_connectToHost')
        .onCall(0).rejects(new Error('bridge down'))
        .onCall(1).rejects(new Error('db host down'))

      const slot = RouterConnectionManager.slots[0]
      try {
        await RouterConnectionManager._createSlotConnection(slot)
        expect.fail('expected connect to fail')
      } catch (error) {
        expect(error.message).to.include(Constants.ROUTER_BRIDGE_DNS_SAN)
        expect(error.message).to.include(defaultRouter.host)
        expect(error.message).to.include('bridge down')
        expect(error.message).to.include('db host down')
      }
      expect(RouterConnectionManager._connectToHost).to.have.been.calledTwice
    })

    it('connects on second host when first fails for Kubernetes host list', async () => {
      const hosts = ['router.iofog.svc.cluster.local', defaultRouter.host]
      $sandbox.stub(RouterConnectionManager, '_resolveRouterEndpoint').resolves({ hosts, port: 5671 })
      const connectStub = $sandbox.stub(RouterConnectionManager, '_connectToHost')
        .onCall(0).rejects(new Error('ECONNREFUSED'))
        .onCall(1).resolves($mockConnection)

      const slot = RouterConnectionManager.slots[0]
      const connection = await RouterConnectionManager._createSlotConnection(slot)

      expect(connection).to.equal($mockConnection)
      expect(connectStub).to.have.been.calledTwice
      expect(connectStub.firstCall.args[1]).to.equal('router.iofog.svc.cluster.local')
      expect(connectStub.secondCall.args[1]).to.equal(defaultRouter.host)
    })
  })

  describe('waitForSendable()', () => {
    it('resolves immediately when sender is already sendable', async () => {
      const sender = {
        sendable: () => true,
        once: sinon.stub(),
        removeListener: sinon.stub()
      }

      await RouterConnectionManager.waitForSendable(sender, 100)
      expect(sender.once).to.not.have.been.called
    })

    it('waits for sendable event when sender is not ready', async () => {
      const sender = new (require('events').EventEmitter)()
      sender.sendable = () => false

      const pending = RouterConnectionManager.waitForSendable(sender, 500)
      setImmediate(() => sender.emit('sendable'))
      await pending
    })

    it('rejects on timeout when sender never becomes sendable', async () => {
      const sender = new (require('events').EventEmitter)()
      sender.sendable = () => false

      await expect(RouterConnectionManager.waitForSendable(sender, 20))
        .to.be.rejectedWith(/not sendable/)
    })
  })

  describe('handleSendError()', () => {
    it('marks slot unhealthy on circular buffer overflow', async () => {
      const sessionId = 'overflow-session'
      const slotId = RouterConnectionManager.slotIdForSession(sessionId)
      const reconnectStub = $sandbox.stub(RouterConnectionManager, 'markSlotUnhealthy').resolves()

      const handled = RouterConnectionManager.handleSendError(
        sessionId,
        new Error('circular buffer overflow')
      )

      expect(handled).to.equal(true)
      expect(reconnectStub).to.have.been.calledOnceWith(slotId, 'circular buffer overflow')
    })
  })
})
