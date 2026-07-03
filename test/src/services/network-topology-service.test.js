const { expect } = require('chai')
const sinon = require('sinon')

const constants = require('../../../src/helpers/constants')
const Errors = require('../../../src/helpers/errors')
const RouterManager = require('../../../src/data/managers/router-manager')
const RouterConnectionManager = require('../../../src/data/managers/router-connection-manager')
const NatsInstanceManager = require('../../../src/data/managers/nats-instance-manager')
const NatsConnectionManager = require('../../../src/data/managers/nats-connection-manager')
const FogManager = require('../../../src/data/managers/iofog-manager')
const NetworkTopologyService = require('../../../src/services/network-topology-service')

describe('Network Topology Service', () => {
  const transaction = {}
  const originalControlPlane = process.env.CONTROL_PLANE

  def('sandbox', () => sinon.createSandbox())

  afterEach(() => {
    $sandbox.restore()
    if (originalControlPlane === undefined) {
      delete process.env.CONTROL_PLANE
    } else {
      process.env.CONTROL_PLANE = originalControlPlane
    }
  })

  function stubFogFindAll (rows = []) {
    $sandbox.stub(FogManager, 'findAll').resolves(rows)
  }

  function makeRouter (overrides = {}) {
    return {
      id: 1,
      isEdge: true,
      isDefault: false,
      iofogUuid: 'edge-uuid',
      host: '10.0.0.1',
      messagingPort: 5671,
      edgeRouterPort: null,
      interRouterPort: null,
      ...overrides
    }
  }

  function makeDefaultRouter () {
    return makeRouter({
      id: 99,
      isEdge: false,
      isDefault: true,
      iofogUuid: null,
      host: 'router.local',
      edgeRouterPort: 45671,
      interRouterPort: 55671
    })
  }

  function makeNats (overrides = {}) {
    return {
      id: 2,
      isLeaf: true,
      isHub: false,
      iofogUuid: 'edge-uuid',
      host: '10.0.0.1',
      serverPort: 4222,
      leafPort: 7422,
      clusterPort: 6222,
      mqttPort: 8883,
      httpPort: 8222,
      jsStorageSize: null,
      jsMemoryStoreSize: null,
      ...overrides
    }
  }

  describe('getSummary()', () => {
    beforeEach(() => {
      process.env.CONTROL_PLANE = 'remote'
      $sandbox.stub(RouterManager, 'getEntity').returns({
        count: $sandbox.stub().resolves(3)
      })
      $sandbox.stub(RouterConnectionManager, 'getEntity').returns({
        count: $sandbox.stub().resolves(2)
      })
      $sandbox.stub(NatsInstanceManager, 'getEntity').returns({
        count: $sandbox.stub().resolves(3)
      })
      $sandbox.stub(NatsConnectionManager, 'getEntity').returns({
        count: $sandbox.stub().resolves(2)
      })
    })

    it('returns control plane and counts', async () => {
      const result = await NetworkTopologyService.getSummary({}, transaction)
      expect(result.controlPlane).to.equal('remote')
      expect(result.router.totalNodes).to.equal(3)
      expect(result.router.totalConnections).to.equal(2)
      expect(result.nats.totalNodes).to.equal(3)
      expect(result.nats.totalConnections).to.equal(2)
    })
  })

  describe('listRouterNodes()', () => {
    beforeEach(() => {
      process.env.CONTROL_PLANE = 'remote'
      $sandbox.stub(RouterManager, 'findOne').resolves(makeDefaultRouter())
      stubFogFindAll([{ uuid: 'edge-uuid', name: 'edge-1', host: '10.0.0.1' }])
      $sandbox.stub(RouterManager, 'getEntity').returns({
        findAndCountAll: $sandbox.stub().resolves({
          count: 1,
          rows: [makeRouter()]
        })
      })
    })

    it('returns paginated router nodes with fog metadata', async () => {
      const result = await NetworkTopologyService.listRouterNodes({ query: { limit: '10', offset: '0' } }, transaction)
      expect(result.total).to.equal(1)
      expect(result.nodes).to.have.length(1)
      expect(result.nodes[0]).to.include({
        id: 'edge-uuid',
        iofogUuid: 'edge-uuid',
        fogName: 'edge-1',
        host: '10.0.0.1',
        deploymentTarget: 'edgelet',
        displayName: 'edge-1',
        role: 'edge',
        mode: 'edge'
      })
    })
  })

  describe('getRouterNode()', () => {
    beforeEach(() => {
      process.env.CONTROL_PLANE = 'kubernetes'
      $sandbox.stub(RouterManager, 'findOne')
        .onFirstCall().resolves(makeDefaultRouter())
      stubFogFindAll([])
    })

    it('returns default router detail with kubernetes deployment target', async () => {
      const result = await NetworkTopologyService.getRouterNode({
        params: { id: constants.DEFAULT_ROUTER_NAME }
      }, transaction)

      expect(result.id).to.equal(constants.DEFAULT_ROUTER_NAME)
      expect(result.deploymentTarget).to.equal('kubernetes')
      expect(result.displayName).to.equal('Kubernetes Router')
      expect(result.isDefault).to.equal(true)
    })

    it('throws when router node is missing', async () => {
      RouterManager.findOne.reset()
      RouterManager.findOne.resolves(null)
      await expect(NetworkTopologyService.getRouterNode({
        params: { id: constants.DEFAULT_ROUTER_NAME }
      }, transaction)).to.be.rejectedWith(Errors.NotFoundError)
    })
  })

  describe('getRouterNodeConnections()', () => {
    beforeEach(() => {
      const defaultRouter = makeDefaultRouter()
      const edgeRouter = makeRouter()
      $sandbox.stub(RouterManager, 'findOne')
        .onFirstCall().resolves(defaultRouter)
        .onSecondCall().resolves(edgeRouter)
      $sandbox.stub(RouterConnectionManager, 'findAllWithRouters')
        .onFirstCall().resolves([{
          id: 7,
          source: edgeRouter,
          dest: defaultRouter
        }])
        .onSecondCall().resolves([])
    })

    it('returns upstream and downstream connections', async () => {
      const result = await NetworkTopologyService.getRouterNodeConnections({
        params: { id: 'edge-uuid' }
      }, transaction)

      expect(result.upstream).to.eql([{
        id: 7,
        source: 'edge-uuid',
        dest: constants.DEFAULT_ROUTER_NAME
      }])
      expect(result.downstream).to.eql([])
    })
  })

  describe('listRouterConnections()', () => {
    beforeEach(() => {
      const defaultRouter = makeDefaultRouter()
      const edgeRouter = makeRouter()
      $sandbox.stub(RouterManager, 'findOne').resolves(defaultRouter)
      $sandbox.stub(RouterManager, 'getEntity').returns({})
      $sandbox.stub(RouterConnectionManager, 'getEntity').returns({
        findAndCountAll: $sandbox.stub().resolves({
          count: 1,
          rows: [{
            id: 7,
            source: edgeRouter,
            dest: defaultRouter
          }]
        })
      })
    })

    it('returns paginated formatted connections', async () => {
      const result = await NetworkTopologyService.listRouterConnections({ query: {} }, transaction)
      expect(result.connections).to.eql([{
        id: 7,
        source: 'edge-uuid',
        dest: constants.DEFAULT_ROUTER_NAME
      }])
    })
  })

  describe('getRouterOverview()', () => {
    beforeEach(() => {
      process.env.CONTROL_PLANE = 'remote'
      const defaultRouter = makeDefaultRouter()
      const edgeRouter = makeRouter()
      $sandbox.stub(RouterManager, 'findOne').resolves(defaultRouter)
      $sandbox.stub(RouterManager, 'findAll').resolves([])
      $sandbox.stub(RouterConnectionManager, 'findAllWithRouters').resolves([{
        id: 7,
        source: edgeRouter,
        dest: defaultRouter
      }])
      stubFogFindAll([])
    })

    it('returns default node and spoke groups', async () => {
      const result = await NetworkTopologyService.getRouterOverview({}, transaction)
      expect(result.defaultNode.id).to.equal(constants.DEFAULT_ROUTER_NAME)
      expect(result.spokeGroups).to.eql([{
        upstreamOf: constants.DEFAULT_ROUTER_NAME,
        role: 'edge',
        count: 1
      }])
    })
  })

  describe('getRouterSubgraph()', () => {
    beforeEach(() => {
      const defaultRouter = makeDefaultRouter()
      const edgeRouter = makeRouter()
      $sandbox.stub(RouterManager, 'findOne')
        .onFirstCall().resolves(defaultRouter)
        .onSecondCall().resolves(edgeRouter)
      $sandbox.stub(RouterConnectionManager, 'findAllWithRouters')
        .onFirstCall().resolves([{ id: 7, source: edgeRouter, dest: defaultRouter }])
        .onSecondCall().resolves([])
      stubFogFindAll([{ uuid: 'edge-uuid', name: 'edge-1', host: '10.0.0.1' }])
    })

    it('requires center query parameter', async () => {
      await expect(NetworkTopologyService.getRouterSubgraph({ query: {} }, transaction))
        .to.be.rejectedWith(Errors.ValidationError)
    })

    it('returns nodes and connections around center', async () => {
      const result = await NetworkTopologyService.getRouterSubgraph({
        query: { center: constants.DEFAULT_ROUTER_NAME, depth: '1' }
      }, transaction)

      expect(result.nodes.map((node) => node.id)).to.include(constants.DEFAULT_ROUTER_NAME)
      expect(result.connections).to.have.length(1)
    })
  })

  describe('listNatsNodes()', () => {
    beforeEach(() => {
      process.env.CONTROL_PLANE = 'remote'
      const defaultHub = makeNats({ id: 50, isLeaf: false, isHub: true, iofogUuid: null, host: 'nats.local' })
      $sandbox.stub(NatsInstanceManager, 'findOne').resolves(defaultHub)
      stubFogFindAll([])
      $sandbox.stub(NatsInstanceManager, 'getEntity').returns({
        findAndCountAll: $sandbox.stub().resolves({
          count: 1,
          rows: [defaultHub]
        })
      })
    })

    it('returns default hub node id', async () => {
      const result = await NetworkTopologyService.listNatsNodes({ query: {} }, transaction)
      expect(result.nodes[0].id).to.equal(constants.DEFAULT_NATS_HUB_NAME)
      expect(result.nodes[0].deploymentTarget).to.equal('remote')
    })
  })
})
