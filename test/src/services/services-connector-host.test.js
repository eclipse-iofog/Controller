const { expect } = require('chai')
const sinon = require('sinon')

const ServicesService = require('../../../src/services/services-service')
const ioFogService = require('../../../src/services/iofog-service')
const MicroserviceManager = require('../../../src/data/managers/microservice-manager')
const ApplicationManager = require('../../../src/data/managers/application-manager')
const FogManager = require('../../../src/data/managers/iofog-manager')
const RouterManager = require('../../../src/data/managers/router-manager')
const ChangeTrackingService = require('../../../src/services/change-tracking-service')
const Errors = require('../../../src/helpers/errors')

const EDGELET_BRIDGE_CONNECTOR_HOST = 'edgelet.default.svc.bridge.local'
const INTERIOR_BRIDGE_CONNECTOR_HOST = '127.0.0.1'

function stubFogRouterMode (sandbox, fogUuid, routerMode) {
  const router = routerMode === 'none'
    ? null
    : { isEdge: routerMode === 'edge' }
  sandbox.stub(FogManager, 'findOne').callsFake((where) => {
    if (where.uuid === fogUuid) {
      return Promise.resolve({ uuid: fogUuid })
    }
    return Promise.resolve(null)
  })
  sandbox.stub(RouterManager, 'findOne').callsFake((where) => {
    if (where.iofogUuid === fogUuid) {
      return Promise.resolve(router)
    }
    return Promise.resolve(null)
  })
}

describe('services-service connector host', () => {
  def('sandbox', () => sinon.createSandbox())
  def('transaction', () => ({}))

  afterEach(() => $sandbox.restore())

  describe('_resolveFogRouterMode()', () => {
    def('subject', () => ServicesService._resolveFogRouterMode('fog-1', $transaction))

    it('returns none when agent has no router', async () => {
      stubFogRouterMode($sandbox, 'fog-1', 'none')
      await expect($subject).to.eventually.equal('none')
    })

    it('returns interior when router is not edge', async () => {
      stubFogRouterMode($sandbox, 'fog-1', 'interior')
      await expect($subject).to.eventually.equal('interior')
    })

    it('returns edge when router is edge', async () => {
      stubFogRouterMode($sandbox, 'fog-1', 'edge')
      await expect($subject).to.eventually.equal('edge')
    })

    it('resolves router mode with fake transaction', async () => {
      stubFogRouterMode($sandbox, 'fog-1', 'edge')
      const mode = await ServicesService._resolveFogRouterMode('fog-1', { fakeTransaction: true })
      expect(mode).to.equal('edge')
    })

    it('throws NotFoundError when fog is missing', async () => {
      $sandbox.stub(FogManager, 'findOne').resolves(null)
      await expect($subject).to.be.rejectedWith(Errors.NotFoundError)
    })
  })

  describe('_determineConnectorHost()', () => {
    def('subject', () => ServicesService._determineConnectorHost($serviceConfig, $transaction))

    describe('microservice (non-hostNetwork, edge router)', () => {
      def('serviceConfig', () => ({
        type: 'microservice',
        resource: 'ms-uuid-1',
        name: 'my-svc',
        targetPort: 8080
      }))
      def('microservice', () => ({
        uuid: 'ms-uuid-1',
        name: 'worker',
        applicationId: 42,
        hostNetworkMode: false,
        iofogUuid: 'fog-1'
      }))
      def('application', () => ({ id: 42, name: 'myapp' }))

      beforeEach(() => {
        stubFogRouterMode($sandbox, 'fog-1', 'edge')
        $sandbox.stub(MicroserviceManager, 'findOne').resolves($microservice)
        $sandbox.stub(ApplicationManager, 'findOne').resolves($application)
      })

      it('returns appName.microserviceName', async () => {
        const host = await $subject
        expect(host).to.equal('myapp.worker')
      })
    })

    describe('microservice (non-hostNetwork, interior router)', () => {
      def('serviceConfig', () => ({
        type: 'microservice',
        resource: 'ms-uuid-1',
        name: 'my-svc',
        targetPort: 8080
      }))
      def('microservice', () => ({
        uuid: 'ms-uuid-1',
        name: 'worker',
        applicationId: 42,
        hostNetworkMode: false,
        iofogUuid: 'fog-interior'
      }))

      beforeEach(() => {
        stubFogRouterMode($sandbox, 'fog-interior', 'interior')
        $sandbox.stub(MicroserviceManager, 'findOne').resolves($microservice)
      })

      it('returns localhost for interior router', async () => {
        const host = await $subject
        expect(host).to.equal(INTERIOR_BRIDGE_CONNECTOR_HOST)
      })
    })

    describe('microservice (hostNetwork, edge router)', () => {
      def('serviceConfig', () => ({
        type: 'microservice',
        resource: 'ms-uuid-2',
        name: 'host-svc',
        targetPort: 9090
      }))
      def('microservice', () => ({
        uuid: 'ms-uuid-2',
        name: 'daemon',
        applicationId: 7,
        hostNetworkMode: true,
        iofogUuid: 'fog-edge'
      }))

      beforeEach(() => {
        stubFogRouterMode($sandbox, 'fog-edge', 'edge')
        $sandbox.stub(MicroserviceManager, 'findOne').resolves($microservice)
      })

      it('returns edgelet bridge connector host', async () => {
        const host = await $subject
        expect(host).to.equal(EDGELET_BRIDGE_CONNECTOR_HOST)
      })
    })

    describe('microservice (hostNetwork, interior router)', () => {
      def('serviceConfig', () => ({
        type: 'microservice',
        resource: 'ms-uuid-2',
        name: 'host-svc',
        targetPort: 9090
      }))
      def('microservice', () => ({
        uuid: 'ms-uuid-2',
        name: 'daemon',
        applicationId: 7,
        hostNetworkMode: true,
        iofogUuid: 'fog-interior'
      }))

      beforeEach(() => {
        stubFogRouterMode($sandbox, 'fog-interior', 'interior')
        $sandbox.stub(MicroserviceManager, 'findOne').resolves($microservice)
      })

      it('returns localhost for interior router', async () => {
        const host = await $subject
        expect(host).to.equal(INTERIOR_BRIDGE_CONNECTOR_HOST)
      })
    })

    describe('microservice (no router on agent)', () => {
      def('serviceConfig', () => ({
        type: 'microservice',
        resource: 'ms-uuid-3',
        name: 'no-router-svc',
        targetPort: 8080
      }))

      beforeEach(() => {
        stubFogRouterMode($sandbox, 'fog-none', 'none')
        $sandbox.stub(MicroserviceManager, 'findOne').resolves({
          uuid: 'ms-uuid-3',
          name: 'worker',
          applicationId: 42,
          hostNetworkMode: false,
          iofogUuid: 'fog-none'
        })
      })

      it('rejects when agent has router mode none', async () => {
        await expect($subject).to.be.rejectedWith(
          Errors.ValidationError,
          /TCP bridge service requires a router on agent/
        )
      })
    })

    describe('agent service (edge router)', () => {
      def('serviceConfig', () => ({
        type: 'agent',
        resource: 'fog-edge',
        name: 'agent-svc',
        targetPort: 22
      }))

      beforeEach(() => {
        stubFogRouterMode($sandbox, 'fog-edge', 'edge')
      })

      it('returns edgelet bridge connector host', async () => {
        const host = await $subject
        expect(host).to.equal(EDGELET_BRIDGE_CONNECTOR_HOST)
      })
    })

    describe('agent service (interior router)', () => {
      def('serviceConfig', () => ({
        type: 'agent',
        resource: 'fog-interior',
        name: 'agent-svc',
        targetPort: 22
      }))

      beforeEach(() => {
        stubFogRouterMode($sandbox, 'fog-interior', 'interior')
      })

      it('returns localhost for interior router', async () => {
        const host = await $subject
        expect(host).to.equal(INTERIOR_BRIDGE_CONNECTOR_HOST)
      })
    })

    describe('agent service (no router)', () => {
      def('serviceConfig', () => ({
        type: 'agent',
        resource: 'fog-none',
        name: 'agent-svc',
        targetPort: 22
      }))

      beforeEach(() => {
        stubFogRouterMode($sandbox, 'fog-none', 'none')
      })

      it('rejects when agent has router mode none', async () => {
        await expect($subject).to.be.rejectedWith(
          Errors.ValidationError,
          /TCP bridge service requires a router on agent/
        )
      })
    })

    describe('k8s / external', () => {
      it('passes through resource for k8s', async () => {
        const host = await ServicesService._determineConnectorHost({
          type: 'k8s',
          resource: 'k8s-svc.default.svc.cluster.local',
          name: 'k8s-svc',
          targetPort: 443
        }, $transaction)
        expect(host).to.equal('k8s-svc.default.svc.cluster.local')
      })

      it('passes through resource for external', async () => {
        const host = await ServicesService._determineConnectorHost({
          type: 'external',
          resource: 'external.example.com',
          name: 'ext-svc',
          targetPort: 443
        }, $transaction)
        expect(host).to.equal('external.example.com')
      })
    })

    describe('errors', () => {
      def('serviceConfig', () => ({
        type: 'microservice',
        resource: 'missing-ms',
        name: 'bad-svc',
        targetPort: 80
      }))

      it('throws NotFoundError when microservice is missing', async () => {
        $sandbox.stub(MicroserviceManager, 'findOne').resolves(null)
        await expect($subject).to.be.rejectedWith(
          Errors.NotFoundError,
          /Microservice not found/
        )
      })

      it('throws NotFoundError when application is missing on edge router', async () => {
        stubFogRouterMode($sandbox, 'fog-edge', 'edge')
        $sandbox.stub(MicroserviceManager, 'findOne').resolves({
          uuid: 'ms-uuid',
          name: 'worker',
          applicationId: 99,
          hostNetworkMode: false,
          iofogUuid: 'fog-edge'
        })
        $sandbox.stub(ApplicationManager, 'findOne').resolves(null)
        await expect($subject).to.be.rejectedWith(
          Errors.NotFoundError,
          /Application not found/
        )
      })
    })
  })

  describe('TCP bridge config (no siteId in router microservice payload)', () => {
    def('transaction', () => ({}))

    describe('_buildTcpConnector()', () => {
      def('serviceConfig', () => ({
        type: 'microservice',
        name: 'my-svc',
        resource: 'ms-uuid-1',
        targetPort: 8080
      }))

      beforeEach(() => {
        stubFogRouterMode($sandbox, 'fog-1', 'edge')
        $sandbox.stub(MicroserviceManager, 'findOne').resolves({
          uuid: 'ms-uuid-1',
          name: 'worker',
          applicationId: 42,
          hostNetworkMode: false,
          iofogUuid: 'fog-1'
        })
        $sandbox.stub(ApplicationManager, 'findOne').resolves({ id: 42, name: 'myapp' })
      })

      it('builds connector without siteId', async () => {
        const connector = await ServicesService._buildTcpConnector($serviceConfig, $transaction)
        expect(connector).to.deep.equal({
          name: 'my-svc-connector',
          host: 'myapp.worker',
          port: '8080',
          address: 'my-svc',
          processId: 'ms-uuid-1'
        })
        expect(connector).to.not.have.property('siteId')
      })
    })

    describe('_buildTcpListener()', () => {
      it('builds listener without siteId', () => {
        const listener = ServicesService._buildTcpListener({
          name: 'my-svc',
          bridgePort: 9000,
          defaultBridge: 'default-router'
        })
        expect(listener).to.deep.equal({
          name: 'my-svc-listener',
          port: '9000',
          address: 'my-svc'
        })
        expect(listener).to.not.have.property('siteId')
      })
    })

    describe('_determineConnectorSiteId()', () => {
      it('returns fog uuid for microservice type', async () => {
        $sandbox.stub(MicroserviceManager, 'findOne').resolves({
          uuid: 'ms-1',
          iofogUuid: 'fog-target'
        })
        const target = await ServicesService._determineConnectorSiteId({
          type: 'microservice',
          resource: 'ms-1'
        }, $transaction)
        expect(target).to.equal('fog-target')
      })

      it('returns agent uuid for agent type', async () => {
        const target = await ServicesService._determineConnectorSiteId({
          type: 'agent',
          resource: 'fog-agent'
        }, $transaction)
        expect(target).to.equal('fog-agent')
      })

      it('returns default-router for k8s and external types', async () => {
        await expect(ServicesService._determineConnectorSiteId({
          type: 'k8s',
          resource: 'svc.default.svc.cluster.local'
        }, $transaction)).to.eventually.equal('default-router')

        await expect(ServicesService._determineConnectorSiteId({
          type: 'external',
          resource: 'example.com'
        }, $transaction)).to.eventually.equal('default-router')
      })
    })

    describe('iofog _buildTcpListenerForFog()', () => {
      it('builds listener without siteId', () => {
        const listener = ioFogService._buildTcpListenerForFog({
          name: 'edge-svc',
          bridgePort: 7000
        })
        expect(listener).to.deep.equal({
          name: 'edge-svc-listener',
          port: '7000',
          address: 'edge-svc'
        })
        expect(listener).to.not.have.property('siteId')
      })
    })
  })
})
