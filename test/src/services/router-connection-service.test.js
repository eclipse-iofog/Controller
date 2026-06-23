const { expect } = require('chai')
const sinon = require('sinon')

const Constants = require('../../../src/helpers/constants')
const config = require('../../../src/config')
const RouterManager = require('../../../src/data/managers/router-manager')
const CertificateService = require('../../../src/services/certificate-service')
const SecretService = require('../../../src/services/secret-service')
const RouterConnectionService = require('../../../src/services/router-connection-service')

describe('Router Connection Service', () => {
  def('sandbox', () => sinon.createSandbox())

  const defaultRouter = {
    host: 'router-db.example.com',
    messagingPort: 5671,
    iofogUuid: 'default-router-uuid'
  }

  const originalControlPlane = process.env.CONTROL_PLANE
  const originalNamespace = process.env.CONTROLLER_NAMESPACE

  beforeEach(() => {
    RouterConnectionService.connection = null
    RouterConnectionService.connectionPromise = null
    RouterConnectionService.cachedRouterRecord = null
    RouterConnectionService.cachedCertificate = null
    RouterConnectionService.connectionOptions = null
    RouterConnectionService.certificatePromise = null

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

  describe('_resolveRouterEndpoint() — Kubernetes control plane', () => {
    beforeEach(() => {
      process.env.CONTROL_PLANE = 'kubernetes'
      process.env.CONTROLLER_NAMESPACE = 'iofog'
    })

    it('returns a single cluster.local service host', async () => {
      const result = await RouterConnectionService._resolveRouterEndpoint()

      expect(result.hosts).to.deep.equal(['router.iofog.svc.cluster.local'])
      expect(result.host).to.equal('router.iofog.svc.cluster.local')
      expect(result.port).to.equal(5671)
      expect(result.routerUuid).to.equal(defaultRouter.iofogUuid)
    })

    it('does not include bridge DNS or DB host in the fallback list', async () => {
      const result = await RouterConnectionService._resolveRouterEndpoint()

      expect(result.hosts).to.not.include(Constants.ROUTER_BRIDGE_DNS_SAN)
      expect(result.hosts).to.not.include(defaultRouter.host)
    })

    it('falls back to DB host when namespace is unset', async () => {
      delete process.env.CONTROLLER_NAMESPACE
      $sandbox.stub(config, 'get').withArgs('app.namespace').returns('')

      const result = await RouterConnectionService._resolveRouterEndpoint()

      expect(result.hosts).to.deep.equal([defaultRouter.host])
    })

    it('falls back to default router service name when namespace and DB host are unset', async () => {
      delete process.env.CONTROLLER_NAMESPACE
      $sandbox.stub(config, 'get').withArgs('app.namespace').returns('')
      RouterManager.findOne.resolves({
        ...defaultRouter,
        host: ''
      })

      const result = await RouterConnectionService._resolveRouterEndpoint()

      expect(result.hosts).to.deep.equal(['router'])
    })
  })

  describe('_resolveRouterEndpoint() — Remote control plane', () => {
    beforeEach(() => {
      process.env.CONTROL_PLANE = 'remote'
      process.env.CONTROLLER_NAMESPACE = 'edge-ns'
    })

    it('returns ordered fallback hosts: bridge DNS, DB host, cluster.local', async () => {
      const result = await RouterConnectionService._resolveRouterEndpoint()

      expect(result.hosts).to.deep.equal([
        Constants.ROUTER_BRIDGE_DNS_SAN,
        defaultRouter.host,
        'router.edge-ns.svc.cluster.local'
      ])
      expect(result.host).to.equal(Constants.ROUTER_BRIDGE_DNS_SAN)
      expect(result.port).to.equal(5671)
    })

    it('deduplicates hosts when DB host matches bridge DNS', async () => {
      RouterManager.findOne.resolves({
        ...defaultRouter,
        host: Constants.ROUTER_BRIDGE_DNS_SAN
      })

      const result = await RouterConnectionService._resolveRouterEndpoint()

      expect(result.hosts).to.deep.equal([
        Constants.ROUTER_BRIDGE_DNS_SAN,
        'router.edge-ns.svc.cluster.local'
      ])
    })

    it('omits cluster.local host when namespace is unset', async () => {
      delete process.env.CONTROLLER_NAMESPACE
      $sandbox.stub(config, 'get').withArgs('app.namespace').returns('')

      const result = await RouterConnectionService._resolveRouterEndpoint()

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

      const result = await RouterConnectionService._resolveRouterEndpoint()

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
      await RouterConnectionService._createControllerCertificate()

      expect(CertificateService.ensureRouterLocalCA).to.have.been.calledOnce
      expect(CertificateService.createCertificateEndpoint).to.have.been.calledOnce
      expect(CertificateService.createCertificateEndpoint.firstCall.args[0].ca).to.deep.equal({
        type: 'direct',
        secretName: Constants.DEFAULT_ROUTER_LOCAL_CA
      })
    })
  })

  describe('_createConnection() — Remote connect fallback', () => {
    const certBundle = {
      cert: Buffer.from('cert'),
      key: Buffer.from('key'),
      ca: Buffer.from('ca')
    }

    def('mockConnection', () => ({ is_open: () => true }))

    beforeEach(() => {
      $sandbox.stub(RouterConnectionService, '_ensureControllerCertificate').resolves(certBundle)
    })

    it('tries hosts in order until one connects', async () => {
      const hosts = [Constants.ROUTER_BRIDGE_DNS_SAN, defaultRouter.host, 'router.edge-ns.svc.cluster.local']
      $sandbox.stub(RouterConnectionService, '_resolveRouterEndpoint').resolves({ hosts, port: 5671 })
      const connectStub = $sandbox.stub(RouterConnectionService, '_connectToHost')
        .onCall(0).rejects(new Error('ECONNREFUSED'))
        .onCall(1).resolves($mockConnection)

      const connection = await RouterConnectionService._createConnection()

      expect(connection).to.equal($mockConnection)
      expect(connectStub).to.have.been.calledTwice
      expect(connectStub.firstCall.args[0]).to.equal(Constants.ROUTER_BRIDGE_DNS_SAN)
      expect(connectStub.secondCall.args[0]).to.equal(defaultRouter.host)
    })

    it('throws after all hosts fail', async () => {
      const hosts = [Constants.ROUTER_BRIDGE_DNS_SAN, defaultRouter.host]
      const lastError = new Error('all hosts down')
      $sandbox.stub(RouterConnectionService, '_resolveRouterEndpoint').resolves({ hosts, port: 5671 })
      $sandbox.stub(RouterConnectionService, '_connectToHost').rejects(lastError)

      await expect(RouterConnectionService._createConnection()).to.be.rejectedWith('all hosts down')
      expect(RouterConnectionService._connectToHost).to.have.been.calledTwice
    })

    it('connects on first host for Kubernetes single-host list', async () => {
      const hosts = ['router.iofog.svc.cluster.local']
      $sandbox.stub(RouterConnectionService, '_resolveRouterEndpoint').resolves({ hosts, port: 5671 })
      const connectStub = $sandbox.stub(RouterConnectionService, '_connectToHost').resolves($mockConnection)

      const connection = await RouterConnectionService._createConnection()

      expect(connection).to.equal($mockConnection)
      expect(connectStub).to.have.been.calledOnce
      expect(connectStub.firstCall.args[0]).to.equal('router.iofog.svc.cluster.local')
    })
  })
})
