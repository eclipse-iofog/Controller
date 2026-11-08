const { expect } = require('chai')
const sinon = require('sinon')

const NatsService = require('../../../src/services/nats-service')
const NatsInstanceManager = require('../../../src/data/managers/nats-instance-manager')
const NatsConnectionManager = require('../../../src/data/managers/nats-connection-manager')
const NatsAccountManager = require('../../../src/data/managers/nats-account-manager')
const NatsOperatorManager = require('../../../src/data/managers/nats-operator-manager')
const NatsAccountRuleManager = require('../../../src/data/managers/nats-account-rule-manager')
const NatsUserManager = require('../../../src/data/managers/nats-user-manager')
const MicroserviceManager = require('../../../src/data/managers/microservice-manager')
const VolumeMappingManager = require('../../../src/data/managers/volume-mapping-manager')
const VolumeMountService = require('../../../src/services/volume-mount-service')
const ConfigMapService = require('../../../src/services/config-map-service')
const ConfigMapManager = require('../../../src/data/managers/config-map-manager')
const NatsAuthService = require('../../../src/services/nats-auth-service')
const SecretService = require('../../../src/services/secret-service')
const Errors = require('../../../src/helpers/errors')
const FogManager = require('../../../src/data/managers/iofog-manager')
const ApplicationManager = require('../../../src/data/managers/application-manager')
const ChangeTrackingService = require('../../../src/services/change-tracking-service')
const ReconcileOutboxManager = require('../../../src/data/managers/reconcile-outbox-manager')
const NatsReconcileTaskManager = require('../../../src/data/managers/nats-reconcile-task-manager')

describe('NATS Service', () => {
  def('sandbox', () => sinon.createSandbox())

  afterEach(() => $sandbox.restore())

  describe('.cleanupNatsForFog()', () => {
    const transaction = {}
    const fog = { uuid: 'fog-1', name: 'local-agent' }
    const natsInstance = { id: 77, isLeaf: true, isHub: false }
    const microservices = [{ uuid: 'ms-1' }]

    def('subject', () => NatsService.cleanupNatsForFogDb(fog, transaction))

    beforeEach(() => {
      $sandbox.stub(NatsInstanceManager, 'findByFog').returns(Promise.resolve(natsInstance))
      $sandbox.stub(NatsInstanceManager, 'findAll').returns(Promise.resolve([]))
      $sandbox.stub(NatsAccountManager, 'findOne').returns(Promise.resolve({ id: 1 }))
      $sandbox.stub(NatsUserManager, 'findOne').returns(Promise.resolve({ credsSecretName: 'nats-creds-sys-admin-hub' }))
      $sandbox.stub(NatsConnectionManager, 'delete').returns(Promise.resolve())
      $sandbox.stub(NatsInstanceManager, 'delete').returns(Promise.resolve())
      $sandbox.stub(MicroserviceManager, 'findAll').returns(Promise.resolve(microservices))
      $sandbox.stub(VolumeMappingManager, 'delete').returns(Promise.resolve())
      $sandbox.stub(VolumeMountService, 'unlinkVolumeMountEndpoint').returns(Promise.resolve())
      $sandbox.stub(VolumeMountService, 'findVolumeMountedFogNodes').returns(Promise.resolve([]))
      $sandbox.stub(VolumeMountService, 'deleteVolumeMountEndpoint').returns(Promise.resolve())
      $sandbox.stub(ConfigMapService, 'deleteConfigMapEndpoint').returns(Promise.resolve())
      $sandbox.stub(NatsAuthService, 'getLeafSystemArtifactSecretNames').returns(Promise.resolve(null))
      $sandbox.stub(NatsAuthService, 'deleteLeafSystemArtifactsForFog').returns(Promise.resolve())
      $sandbox.stub(SecretService, 'deleteSecretEndpoint').returns(Promise.resolve())
    })

    it('cleans up instance, mounts, configmaps, and secrets', async () => {
      await $subject

      expect(NatsInstanceManager.findByFog).to.have.been.calledWith(fog.uuid, transaction)
      expect(NatsConnectionManager.delete).to.have.been.calledWith({ sourceNats: natsInstance.id }, transaction)
      expect(NatsConnectionManager.delete).to.have.been.calledWith({ destNats: natsInstance.id }, transaction)
      expect(NatsInstanceManager.delete).to.have.been.calledWith({ id: natsInstance.id }, transaction)
      expect(ConfigMapService.deleteConfigMapEndpoint).to.have.been.called
      expect(SecretService.deleteSecretEndpoint).to.have.been.called
    })

    it('reloads a remaining server when its only peer is removed', async () => {
      const removed = { id: 77, isLeaf: false, isHub: false, iofogUuid: 'gone', host: '10.0.0.9', clusterPort: 6222 }
      const peer = { id: 3, isLeaf: false, isHub: false, iofogUuid: 'peer', host: '10.0.0.3', clusterPort: 6222 }
      NatsInstanceManager.findByFog.resolves(removed)
      NatsInstanceManager.findAll.resetBehavior()
      NatsInstanceManager.findAll
        .onCall(0).resolves([removed, peer])
        .onCall(1).resolves([peer])
        .onCall(2).resolves([peer])
      $sandbox.stub(NatsConnectionManager, 'findAllWithNats')
        .onCall(0).resolves([{ dest: { id: removed.id, isLeaf: false, host: removed.host, clusterPort: 6222 } }])
        .onCall(1).resolves([])
      $sandbox.stub(MicroserviceManager, 'findOne').resolves({ uuid: 'ms-peer' })
      $sandbox.stub(MicroserviceManager, 'update').resolves()
      $sandbox.stub(ChangeTrackingService, 'update').resolves()
      $sandbox.stub(NatsAuthService, 'deleteServerSysUserForFog').resolves()
      $sandbox.stub(ReconcileOutboxManager, 'enqueueNats').resolves()

      await NatsService.cleanupNatsForFogDb(fog, transaction)

      expect(MicroserviceManager.update).to.have.been.calledWith(
        { uuid: 'ms-peer' },
        { rebuild: true },
        transaction
      )
    })
  })

  describe('single hub server config (no cluster block)', () => {
    it('server-no-cluster.conf template exists and has no cluster block', () => {
      const fs = require('fs')
      const path = require('path')
      const noClusterPath = path.join(__dirname, '../../../src/templates/nats/server-no-cluster.conf')
      const content = fs.readFileSync(noClusterPath, 'utf8')
      expect(content).to.not.include('cluster {')
      expect(content).to.include('port:')
      expect(content).to.include('jetstream')
    })
  })

  describe('K8s NATS ConfigMaps', () => {
    it('uses constants iofog-nats-config and iofog-nats-jwt-bundle for K8s ConfigMap names', () => {
      const K8S_NATS_SERVER_CONFIG_MAP = 'iofog-nats-config'
      const K8S_NATS_JWT_BUNDLE_CONFIG_MAP = 'iofog-nats-jwt-bundle'
      expect(K8S_NATS_SERVER_CONFIG_MAP).to.equal('iofog-nats-config')
      expect(K8S_NATS_JWT_BUNDLE_CONFIG_MAP).to.equal('iofog-nats-jwt-bundle')
    })
  })

  describe('._ensureConfigMap()', () => {
    const transaction = {}
    const name = 'iofog-nats-jwt-bundle'
    const data = { 'bundle.jwt': 'jwt-content' }

    def('subject', () => NatsService._ensureConfigMap(name, data, transaction))

    beforeEach(() => {
      $sandbox.stub(ConfigMapService, 'createConfigMapEndpoint')
      $sandbox.stub(ConfigMapService, 'updateConfigMapEndpoint')
    })

    it('creates the ConfigMap when it does not exist', async () => {
      $sandbox.stub(ConfigMapManager, 'getConfigMap').resolves(null)
      ConfigMapService.createConfigMapEndpoint.resolves({ name })

      await $subject

      expect(ConfigMapService.createConfigMapEndpoint).to.have.been.calledOnceWith({
        name,
        data,
        immutable: false,
        useVault: true
      }, transaction)
      expect(ConfigMapService.updateConfigMapEndpoint).to.not.have.been.called
    })

    it('updates the ConfigMap when content changed', async () => {
      $sandbox.stub(ConfigMapManager, 'getConfigMap').resolves({ name, data: { 'bundle.jwt': 'old' } })
      ConfigMapService.updateConfigMapEndpoint.resolves({ name })

      await $subject

      expect(ConfigMapService.createConfigMapEndpoint).to.not.have.been.called
      expect(ConfigMapService.updateConfigMapEndpoint).to.have.been.calledOnceWith(name, { data, immutable: false }, transaction)
    })

    it('skips update when content is unchanged', async () => {
      $sandbox.stub(ConfigMapManager, 'getConfigMap').resolves({ name, data })

      await $subject

      expect(ConfigMapService.createConfigMapEndpoint).to.not.have.been.called
      expect(ConfigMapService.updateConfigMapEndpoint).to.not.have.been.called
    })

    it('reconciles after concurrent create ConflictError', async () => {
      const conflict = new Errors.ConflictError('ConfigMap already exists')
      $sandbox.stub(ConfigMapManager, 'getConfigMap')
        .onFirstCall().resolves(null)
        .onSecondCall().resolves({ name, data })
      ConfigMapService.createConfigMapEndpoint.rejects(conflict)

      await $subject

      expect(ConfigMapService.createConfigMapEndpoint).to.have.been.calledOnce
      expect(ConfigMapManager.getConfigMap).to.have.been.calledTwice
      expect(ConfigMapService.updateConfigMapEndpoint).to.not.have.been.called
    })

    it('updates after concurrent create when desired content differs', async () => {
      const conflict = new Errors.ConflictError('ConfigMap already exists')
      $sandbox.stub(ConfigMapManager, 'getConfigMap')
        .onFirstCall().resolves(null)
        .onSecondCall().resolves({ name, data: { 'bundle.jwt': 'old' } })
      ConfigMapService.createConfigMapEndpoint.rejects(conflict)
      ConfigMapService.updateConfigMapEndpoint.resolves({ name })

      await $subject

      expect(ConfigMapService.createConfigMapEndpoint).to.have.been.calledOnce
      expect(ConfigMapService.updateConfigMapEndpoint).to.have.been.calledOnceWith(name, { data, immutable: false }, transaction)
    })
  })

  describe('mergeK8sHubClusterRoutes', () => {
    it('preserves operator routes (nats-headless) and appends controller-managed routes', () => {
      const currentRoutes = [
        'nats://nats-0.nats-headless:6222',
        'nats://nats-1.nats-headless:6222'
      ]
      const desiredControllerRoutes = ['nats://40.120.10.10:6222']
      const result = NatsService.mergeK8sHubClusterRoutes(currentRoutes, desiredControllerRoutes)
      expect(result).to.eql([
        'nats://nats-0.nats-headless:6222',
        'nats://nats-1.nats-headless:6222',
        'nats://40.120.10.10:6222'
      ])
    })

    it('keeps only operator routes when desiredControllerRoutes is empty', () => {
      const currentRoutes = [
        'nats://nats-0.nats-headless:6222',
        'nats://nats-1.nats-headless:6222',
        'nats://40.120.10.10:6222'
      ]
      const result = NatsService.mergeK8sHubClusterRoutes(currentRoutes, [])
      expect(result).to.eql([
        'nats://nats-0.nats-headless:6222',
        'nats://nats-1.nats-headless:6222'
      ])
    })

    it('returns only desiredControllerRoutes when currentRoutes has no operator routes', () => {
      const currentRoutes = ['nats://40.120.10.10:6222']
      const desiredControllerRoutes = ['nats://10.0.0.1:6222']
      const result = NatsService.mergeK8sHubClusterRoutes(currentRoutes, desiredControllerRoutes)
      expect(result).to.eql(['nats://10.0.0.1:6222'])
    })

    it('handles empty or null currentRoutes', () => {
      expect(NatsService.mergeK8sHubClusterRoutes([], ['nats://40.120.10.10:6222'])).to.eql(['nats://40.120.10.10:6222'])
      expect(NatsService.mergeK8sHubClusterRoutes(null, ['nats://40.120.10.10:6222'])).to.eql(['nats://40.120.10.10:6222'])
    })

    it('ignores non-string entries in currentRoutes', () => {
      const currentRoutes = [
        'nats://nats-0.nats-headless:6222',
        123,
        null,
        undefined
      ]
      const result = NatsService.mergeK8sHubClusterRoutes(currentRoutes, [])
      expect(result).to.eql(['nats://nats-0.nats-headless:6222'])
    })

    it('keeps a nats-headless route when mesh routes replace the controller list', () => {
      const currentRoutes = [
        'nats://nats-0.nats-headless:6222',
        'nats://10.0.0.1:6222'
      ]
      const meshRoutes = ['nats://10.0.0.2:6222', 'nats://10.0.0.3:6222']
      expect(NatsService.mergeK8sHubClusterRoutes(currentRoutes, meshRoutes)).to.eql([
        'nats://nats-0.nats-headless:6222',
        'nats://10.0.0.2:6222',
        'nats://10.0.0.3:6222'
      ])
    })
  })

  describe('server mesh', () => {
    const transaction = {}

    beforeEach(() => {
      $sandbox.stub(NatsInstanceManager, 'findAll')
      $sandbox.stub(NatsConnectionManager, 'findAllWithNats')
      $sandbox.stub(NatsConnectionManager, 'create').resolves()
      $sandbox.stub(NatsConnectionManager, 'delete').resolves()
    })

    it('connects every server to every other server in both directions', async () => {
      const hub = { id: 1, isLeaf: false, isHub: true, host: '10.0.0.1', iofogUuid: 'hub' }
      const edge = { id: 2, isLeaf: false, isHub: false, host: '10.0.0.2', iofogUuid: 'edge' }
      NatsInstanceManager.findAll.resolves([hub, edge])
      NatsConnectionManager.findAllWithNats.callsFake(({ sourceNats }) => {
        if (sourceNats === hub.id) {
          return Promise.resolve([{ id: 8, dest: hub }])
        }
        return Promise.resolve([])
      })

      await NatsService._repairServerClusterMesh(transaction)

      const created = NatsConnectionManager.create.getCalls().map((call) => call.args[0])
      expect(created).to.deep.include({ sourceNats: hub.id, destNats: edge.id })
      expect(created).to.deep.include({ sourceNats: edge.id, destNats: hub.id })
      expect(created.some((row) => row.sourceNats === row.destNats)).to.equal(false)
      expect(NatsConnectionManager.delete).to.have.been.calledWith({ id: 8 }, transaction)
    })

    it('removes a server link that points at a leaf', async () => {
      const server = { id: 1, isLeaf: false, host: '10.0.0.1', iofogUuid: 'srv' }
      NatsInstanceManager.findAll.resolves([server])
      NatsConnectionManager.findAllWithNats.resolves([
        { id: 9, dest: { id: 3, isLeaf: true, host: '10.0.0.3' } }
      ])

      await NatsService._repairServerClusterMesh(transaction)

      expect(NatsConnectionManager.findAllWithNats).to.have.been.calledOnceWith({ sourceNats: server.id }, transaction)
      expect(NatsConnectionManager.delete).to.have.been.calledOnceWith({ id: 9 }, transaction)
      expect(NatsConnectionManager.create).to.not.have.been.called
    })

    it('does not reject a server whose upstream list names a leaf', async () => {
      const server = { id: 1, isLeaf: false, host: '10.0.0.1', iofogUuid: 'srv' }
      const other = { id: 2, isLeaf: false, host: '10.0.0.2', iofogUuid: 'other' }
      const hub = { id: 9, isHub: true, isLeaf: false, iofogUuid: 'hub' }
      NatsInstanceManager.findAll.resolves([server, other])
      NatsConnectionManager.findAllWithNats.resolves([])
      $sandbox.stub(FogManager, 'findOne').rejects(new Error('server list must not be resolved'))

      await NatsService._storeNatsUpstreams(
        server,
        { uuid: 'srv', isSystem: true },
        { upstreamNatsServers: ['some-leaf'] },
        hub,
        transaction
      )

      expect(FogManager.findOne).to.not.have.been.called
      expect(NatsConnectionManager.create).to.have.been.calledWith(
        { sourceNats: server.id, destNats: other.id },
        transaction
      )
      expect(NatsConnectionManager.create).to.have.been.calledWith(
        { sourceNats: other.id, destNats: server.id },
        transaction
      )
    })
  })

  describe('cluster routes', () => {
    const transaction = {}
    const self = { id: 1, isLeaf: false, host: '10.0.0.1', clusterPort: 6222, iofogUuid: 'self' }

    it('lists only the other server when two servers are connected', async () => {
      $sandbox.stub(NatsConnectionManager, 'findAllWithNats').resolves([
        { dest: { id: 2, isLeaf: false, host: '10.0.0.2', clusterPort: 6222 } }
      ])

      const routes = await NatsService._computeClusterRoutesForInstance(self, transaction)

      expect(routes).to.eql(['nats://10.0.0.2:6222'])
    })

    it('builds routes from the other servers and skips an empty host', async () => {
      $sandbox.stub(NatsConnectionManager, 'findAllWithNats').resolves([
        { dest: { id: 1, isLeaf: false, host: '10.0.0.1', clusterPort: 6222 } },
        { dest: { id: 2, isLeaf: false, host: '   ', clusterPort: 6222 } },
        { dest: { id: 3, isLeaf: false, host: '10.0.0.3', clusterPort: 6223 } },
        { dest: { id: 4, isLeaf: true, host: '10.0.0.4', clusterPort: 6222 } }
      ])

      const routes = await NatsService._computeClusterRoutesForInstance(self, transaction)

      expect(routes).to.eql(['nats://10.0.0.3:6223'])
    })

    it('uses the no-cluster server config when a server has no peers', () => {
      const content = NatsService._serverConfigTemplate([])
      expect(content).to.not.include('cluster {')
      expect(content).to.include('jetstream')
    })

    it('uses the clustered server config when a peer route exists', () => {
      const content = NatsService._serverConfigTemplate(['nats://10.0.0.2:6222'])
      expect(content).to.include('cluster:')
      expect(content).to.include('routes:')
    })

    it('reloads when a server gains or loses its only peer', () => {
      expect(NatsService._clusterConfigRequiresRebuild([], ['nats://10.0.0.2:6222'])).to.equal(true)
      expect(NatsService._clusterConfigRequiresRebuild(['nats://10.0.0.2:6222'], [])).to.equal(true)
      expect(NatsService._clusterConfigRequiresRebuild([], [])).to.equal(false)
      expect(NatsService._clusterConfigRequiresRebuild(
        ['nats://10.0.0.2:6222'],
        ['nats://10.0.0.2:6222']
      )).to.equal(false)
      expect(NatsService._clusterConfigRequiresRebuild(
        ['nats://10.0.0.2:6222', 'nats://10.0.0.3:6222'],
        ['nats://10.0.0.2:6222']
      )).to.equal(true)
    })

    it('patches the hub routes and rolls when a server becomes a leaf', () => {
      const update = NatsService._controllerClusterRouteUpdate(
        ['nats://10.0.0.1:6222', 'nats://10.0.0.2:6222'],
        ['nats://10.0.0.1:6222']
      )
      expect(update.k8sHubPatch).to.eql(['nats://10.0.0.1:6222'])
      expect(update.k8sRollout).to.equal(true)
    })

    it('patches the hub routes without a rollout when a peer joins an existing cluster', () => {
      const update = NatsService._controllerClusterRouteUpdate(
        ['nats://10.0.0.1:6222'],
        ['nats://10.0.0.1:6222', 'nats://10.0.0.2:6222']
      )
      expect(update.k8sHubPatch).to.eql(['nats://10.0.0.1:6222', 'nats://10.0.0.2:6222'])
      expect(update.k8sRollout).to.equal(false)
    })

    it('patches the hub routes and rolls when the first cluster route appears', () => {
      const update = NatsService._controllerClusterRouteUpdate([], ['nats://10.0.0.2:6222'])
      expect(update.k8sHubPatch).to.eql(['nats://10.0.0.2:6222'])
      expect(update.k8sRollout).to.equal(true)
    })

    it('leaves the hub routes alone when the controller route list is unchanged', () => {
      const update = NatsService._controllerClusterRouteUpdate(
        ['nats://10.0.0.2:6222', 'nats://10.0.0.1:6222'],
        ['nats://10.0.0.1:6222', 'nats://10.0.0.2:6222']
      )
      expect(update.k8sHubPatch).to.equal(null)
      expect(update.k8sRollout).to.equal(false)
    })
  })

  describe('leaf upstream list', () => {
    const transaction = {}
    const hub = { id: 1, isHub: true, isLeaf: false, iofogUuid: 'hub-agent', host: '10.0.0.1', clusterPort: 6222 }
    const serverB = { id: 2, isHub: false, isLeaf: false, iofogUuid: 'server-b', host: '10.0.0.2', clusterPort: 6222 }
    const leaf = { id: 10, isLeaf: true, iofogUuid: 'leaf-agent', host: '10.0.0.10' }
    const parentA = { id: 11, isLeaf: true, iofogUuid: 'parent-a', host: '10.0.0.11' }
    const parentB = { id: 12, isLeaf: true, iofogUuid: 'parent-b', host: '10.0.0.12' }
    const middle = { id: 13, isLeaf: true, iofogUuid: 'middle', host: '10.0.0.13' }
    let instances
    let fogsByName
    let destsBySource

    beforeEach(() => {
      instances = {
        [hub.iofogUuid]: hub,
        [serverB.iofogUuid]: serverB,
        [leaf.iofogUuid]: leaf,
        [parentA.iofogUuid]: parentA,
        [parentB.iofogUuid]: parentB,
        [middle.iofogUuid]: middle
      }
      fogsByName = {}
      destsBySource = {}
      $sandbox.stub(NatsInstanceManager, 'findOne').callsFake((query) => {
        return Promise.resolve((query && instances[query.iofogUuid]) || null)
      })
      $sandbox.stub(FogManager, 'findOne').callsFake((query) => {
        return Promise.resolve((query && fogsByName[query.name]) || null)
      })
      $sandbox.stub(NatsConnectionManager, 'findAllWithNats').callsFake((query) => {
        const dests = destsBySource[query.sourceNats] || []
        return Promise.resolve(dests.map((dest) => ({ dest })))
      })
      $sandbox.stub(NatsConnectionManager, 'create').resolves()
      $sandbox.stub(NatsConnectionManager, 'delete').resolves()
      $sandbox.stub(ReconcileOutboxManager, 'enqueueNats').resolves()
    })

    function validate (ids, source = leaf) {
      return NatsService._validateAndReturnUpstreamNats(ids, false, hub, transaction, source)
    }

    it('attaches a new leaf to the hub only', async () => {
      const result = await NatsService._validateAndReturnUpstreamNats(undefined, true, hub, transaction, leaf)
      expect(result).to.eql([hub])
      expect(FogManager.findOne).to.not.have.been.called
    })

    it('treats a null list as omitted and an empty list as no upstream', async () => {
      const omitted = await NatsService._validateAndReturnUpstreamNats(null, false, hub, transaction, leaf)
      const cleared = await NatsService._validateAndReturnUpstreamNats([], false, hub, transaction, leaf)
      expect(omitted).to.eql([hub])
      expect(cleared).to.eql([])
    })

    it('starts a system agent with no upstreams when the hub does not exist yet', async () => {
      const result = await NatsService._validateAndReturnUpstreamNats(undefined, true, null, transaction, leaf)
      expect(result).to.eql([])
    })

    it('rejects a leaf when the hub does not exist yet', () => {
      return expect(NatsService._validateAndReturnUpstreamNats(undefined, false, null, transaction, leaf))
        .to.be.rejectedWith(Errors.NotFoundError)
    })

    it('stores nothing when a leaf upstream list is empty', async () => {
      NatsConnectionManager.findAllWithNats.callsFake(() => Promise.resolve([{ id: 4, dest: hub }]))
      await NatsService._storeNatsUpstreams(
        leaf,
        { isSystem: false },
        { upstreamNatsServers: [] },
        hub,
        transaction
      )
      expect(NatsConnectionManager.delete).to.have.been.calledOnceWith({ id: 4 }, transaction)
      expect(NatsConnectionManager.create).to.not.have.been.called
    })

    it('stores only the hub when a leaf omits its upstream list', async () => {
      await NatsService._storeNatsUpstreams(leaf, { isSystem: false }, {}, hub, transaction)
      expect(NatsConnectionManager.create).to.have.been.calledOnceWith(
        { sourceNats: leaf.id, destNats: hub.id },
        transaction
      )
    })

    it('rejects a list that mixes a server and a leaf', () => {
      return expect(validate([hub.iofogUuid, parentA.iofogUuid]))
        .to.be.rejectedWith(Errors.ValidationError, /mix servers and leaves/)
    })

    it('rejects a leaf that names itself', () => {
      return expect(validate([leaf.iofogUuid]))
        .to.be.rejectedWith(Errors.ValidationError, /this agent/)
    })

    it('rejects a cycle back to this leaf', () => {
      destsBySource[parentA.id] = [leaf]
      return expect(validate([parentA.iofogUuid]))
        .to.be.rejectedWith(Errors.ValidationError, /cycle/)
    })

    it('rejects a cycle through another leaf', () => {
      destsBySource[parentA.id] = [middle]
      destsBySource[middle.id] = [leaf]
      return expect(validate([parentA.iofogUuid]))
        .to.be.rejectedWith(Errors.ValidationError, /cycle/)
    })

    it('rejects a parent that already dials another parent in the list', () => {
      destsBySource[parentA.id] = [parentB]
      return expect(validate([parentA.iofogUuid, parentB.iofogUuid]))
        .to.be.rejectedWith(Errors.ValidationError, /cycle/)
    })

    it('rejects leaf parents that dial different upstreams', () => {
      destsBySource[parentA.id] = [hub]
      destsBySource[parentB.id] = []
      return expect(validate([parentA.iofogUuid, parentB.iofogUuid]))
        .to.be.rejectedWith(Errors.ValidationError, /same upstream set/)
    })

    it('accepts a parent leaf that has no upstreams', async () => {
      const result = await validate([parentA.iofogUuid])
      expect(result).to.eql([parentA])
    })

    it('accepts leaf parents that both have no upstreams', async () => {
      const result = await validate([parentB.iofogUuid, parentA.iofogUuid])
      expect(result.map((instance) => instance.id)).to.eql([parentB.id, parentA.id])
    })

    it('accepts leaf parents that dial the same servers', async () => {
      destsBySource[parentA.id] = [serverB, hub]
      destsBySource[parentB.id] = [hub, serverB]
      const result = await validate([parentA.iofogUuid, parentB.iofogUuid])
      expect(result.map((instance) => instance.id)).to.eql([parentA.id, parentB.id])
    })

    it('keeps the first occurrence of a repeated upstream', async () => {
      const result = await validate(['default-nats-hub', hub.iofogUuid, 'default-nats-hub'])
      expect(result).to.eql([hub])
    })

    it('accepts a list of servers', async () => {
      const result = await validate(['default-nats-hub', serverB.iofogUuid])
      expect(result.map((instance) => instance.id)).to.eql([hub.id, serverB.id])
    })

    it('rejects an unknown upstream name', () => {
      return expect(validate(['missing'])).to.be.rejectedWith(Errors.NotFoundError)
    })

    it('rejects an agent that has no NATS instance', () => {
      fogsByName['edge-x'] = { uuid: 'edge-x', name: 'edge-x' }
      return expect(validate(['edge-x'])).to.be.rejectedWith(Errors.NotFoundError)
    })

    it('refreshes the leaf and leaf parents when the upstream list changes', async () => {
      NatsConnectionManager.findAllWithNats.callsFake((query) => {
        if (query.sourceNats === leaf.id) {
          return Promise.resolve([{ id: 4, dest: parentA }])
        }
        const dests = destsBySource[query.sourceNats] || []
        return Promise.resolve(dests.map((dest) => ({ dest })))
      })

      await NatsService._storeNatsUpstreams(
        leaf,
        { isSystem: false },
        { upstreamNatsServers: [parentB.iofogUuid] },
        hub,
        transaction
      )

      expect(ReconcileOutboxManager.enqueueNats).to.have.been.calledOnce
      const payload = ReconcileOutboxManager.enqueueNats.firstCall.args[0]
      expect(payload.reason).to.equal('leaf-upstream-changed')
      expect(payload.fogUuids).to.have.members([leaf.iofogUuid, parentA.iofogUuid, parentB.iofogUuid])
      expect(payload.fogUuids).to.not.include(hub.iofogUuid)
    })

    it('refreshes ancestor leaves when a parent leaf is added or removed', async () => {
      const grandparent = { id: 14, isLeaf: true, iofogUuid: 'grandparent', host: '10.0.0.14' }
      instances[grandparent.iofogUuid] = grandparent
      destsBySource[parentB.id] = [grandparent]
      destsBySource[grandparent.id] = [hub]
      NatsConnectionManager.findAllWithNats.callsFake((query) => {
        if (query.sourceNats === leaf.id) {
          return Promise.resolve([{ id: 4, dest: parentA }])
        }
        const dests = destsBySource[query.sourceNats] || []
        return Promise.resolve(dests.map((dest) => ({ dest })))
      })

      await NatsService._storeNatsUpstreams(
        leaf,
        { isSystem: false },
        { upstreamNatsServers: [parentB.iofogUuid] },
        hub,
        transaction
      )

      const payload = ReconcileOutboxManager.enqueueNats.firstCall.args[0]
      expect(payload.fogUuids).to.have.members([
        leaf.iofogUuid,
        parentA.iofogUuid,
        parentB.iofogUuid,
        grandparent.iofogUuid
      ])
      expect(payload.fogUuids).to.not.include(hub.iofogUuid)
    })

    it('refreshes ancestor leaves when a parent leaf is removed', async () => {
      const grandparent = { id: 14, isLeaf: true, iofogUuid: 'grandparent', host: '10.0.0.14' }
      destsBySource[parentB.id] = [grandparent]
      destsBySource[grandparent.id] = [hub]
      NatsConnectionManager.findAllWithNats.callsFake((query) => {
        if (query.sourceNats === leaf.id) {
          return Promise.resolve([{ id: 4, dest: parentB }])
        }
        const dests = destsBySource[query.sourceNats] || []
        return Promise.resolve(dests.map((dest) => ({ dest })))
      })

      await NatsService._storeNatsUpstreams(
        leaf,
        { isSystem: false },
        { upstreamNatsServers: [hub.iofogUuid] },
        hub,
        transaction
      )

      const payload = ReconcileOutboxManager.enqueueNats.firstCall.args[0]
      expect(payload.fogUuids).to.have.members([
        leaf.iofogUuid,
        parentB.iofogUuid,
        grandparent.iofogUuid
      ])
      expect(payload.fogUuids).to.not.include(hub.iofogUuid)
    })

    it('does not refresh a server when a leaf starts or stops dialing it', async () => {
      NatsConnectionManager.findAllWithNats.callsFake((query) => {
        if (query.sourceNats === leaf.id) {
          return Promise.resolve([{ id: 4, dest: hub }])
        }
        const dests = destsBySource[query.sourceNats] || []
        return Promise.resolve(dests.map((dest) => ({ dest })))
      })

      await NatsService._storeNatsUpstreams(
        leaf,
        { isSystem: false },
        { upstreamNatsServers: [parentA.iofogUuid] },
        hub,
        transaction
      )

      const payload = ReconcileOutboxManager.enqueueNats.firstCall.args[0]
      expect(payload.fogUuids).to.have.members([leaf.iofogUuid, parentA.iofogUuid])
      expect(payload.fogUuids).to.not.include(hub.iofogUuid)
    })

    it('leaves parents alone when the upstream list is unchanged', async () => {
      NatsConnectionManager.findAllWithNats.callsFake((query) => {
        if (query.sourceNats === leaf.id) {
          return Promise.resolve([{ id: 4, dest: parentA }])
        }
        const dests = destsBySource[query.sourceNats] || []
        return Promise.resolve(dests.map((dest) => ({ dest })))
      })

      await NatsService._storeNatsUpstreams(
        leaf,
        { isSystem: false },
        { upstreamNatsServers: [parentA.iofogUuid] },
        hub,
        transaction
      )

      expect(ReconcileOutboxManager.enqueueNats).to.not.have.been.called
    })
  })

  describe('leaf remotes', () => {
    const transaction = {}
    const fog = { uuid: 'leaf-agent', name: 'edge-1', host: '10.0.0.10' }
    const natsInstance = { id: 10, isLeaf: true, leafPort: 7422 }
    const certName = 'nats-server-edge-1'

    function upstream (host, leafPort, id) {
      return { dest: { id, host, leafPort, isLeaf: false } }
    }

    beforeEach(() => {
      $sandbox.stub(NatsConnectionManager, 'findAllWithNats').resolves([])
      $sandbox.stub(NatsInstanceManager, 'findByFog').resolves(null)
      $sandbox.stub(MicroserviceManager, 'findAll').resolves([])
      $sandbox.stub(ApplicationManager, 'findOne').resolves(null)
      $sandbox.stub(NatsAuthService, 'ensureAccountForApplication').resolves(null)
    })

    function useAccount (id, name, publicKey) {
      MicroserviceManager.findAll.resolves([{ applicationId: id }])
      ApplicationManager.findOne.resolves({ id, name, isSystem: false, natsAccess: true })
      NatsAuthService.ensureAccountForApplication.resolves({ name, publicKey })
    }

    it('builds one remote with a url for each parent leaf', async () => {
      NatsConnectionManager.findAllWithNats.resolves([
        { dest: { id: 11, host: '10.0.0.11', leafPort: 7422, isLeaf: true } },
        { dest: { id: 12, host: '10.0.0.12', leafPort: 7422, isLeaf: true } }
      ])
      useAccount(7, 'billing', 'PUB_BILLING')

      const remotes = await NatsService._computeLeafRemotesForInstance(fog, natsInstance, transaction, certName)

      expect(remotes).to.have.length(1)
      expect(remotes[0].urls).to.eql([
        'tls://10.0.0.11:7422',
        'tls://10.0.0.12:7422'
      ])
    })

    it('builds one remote with a url for each upstream in stored order', async () => {
      NatsConnectionManager.findAllWithNats.resolves([
        upstream('10.0.0.1', 7422, 1),
        upstream('10.0.0.3', 7424, 3),
        upstream('10.0.0.2', 7423, 2)
      ])
      useAccount(7, 'billing', 'PUB_BILLING')

      const remotes = await NatsService._computeLeafRemotesForInstance(fog, natsInstance, transaction, certName)

      expect(remotes).to.have.length(1)
      expect(remotes[0].urls).to.eql([
        'tls://10.0.0.1:7422',
        'tls://10.0.0.3:7424',
        'tls://10.0.0.2:7423'
      ])
      expect(remotes[0].account).to.equal('PUB_BILLING')
      expect(remotes[0].credentials).to.equal('/etc/nats/creds/billing/leaf-edge-1.creds')
      expect(remotes[0].tls).to.include({ verify: true, handshake_first: true })
    })

    it('keeps the first url when a destination is repeated', async () => {
      NatsConnectionManager.findAllWithNats.resolves([
        upstream('10.0.0.1', 7422, 1),
        upstream('10.0.0.1', 7422, 1)
      ])
      useAccount(7, 'billing', 'PUB_BILLING')

      const remotes = await NatsService._computeLeafRemotesForInstance(fog, natsInstance, transaction, certName)

      expect(remotes).to.have.length(1)
      expect(remotes[0].urls).to.eql(['tls://10.0.0.1:7422'])
    })

    it('builds one remote per application with the same urls', async () => {
      NatsConnectionManager.findAllWithNats.resolves([
        upstream('10.0.0.1', 7422, 1),
        upstream('10.0.0.2', 7422, 2)
      ])
      MicroserviceManager.findAll.resolves([{ applicationId: 7 }, { applicationId: 8 }])
      ApplicationManager.findOne.callsFake((query) => {
        if (query.id === 7) {
          return Promise.resolve({ id: 7, name: 'billing', isSystem: false, natsAccess: true })
        }
        return Promise.resolve({ id: 8, name: 'telemetry', isSystem: false, natsAccess: true })
      })
      NatsAuthService.ensureAccountForApplication.callsFake((appId) => {
        if (appId === 7) {
          return Promise.resolve({ name: 'billing', publicKey: 'PUB_BILLING' })
        }
        return Promise.resolve({ name: 'telemetry', publicKey: 'PUB_TELEMETRY' })
      })

      const remotes = await NatsService._computeLeafRemotesForInstance(fog, natsInstance, transaction, certName)

      expect(remotes.map((remote) => remote.account)).to.eql(['PUB_BILLING', 'PUB_TELEMETRY'])
      expect(remotes[0].urls).to.eql(remotes[1].urls)
      expect(remotes[0].urls).to.eql(['tls://10.0.0.1:7422', 'tls://10.0.0.2:7422'])
      expect(remotes[1].credentials).to.equal('/etc/nats/creds/telemetry/leaf-edge-1.creds')
    })

    it('builds no remotes when a leaf has no upstreams', async () => {
      useAccount(7, 'billing', 'PUB_BILLING')

      const remotes = await NatsService._computeLeafRemotesForInstance(fog, natsInstance, transaction, certName)

      expect(remotes).to.eql([])
      expect(NatsAuthService.ensureAccountForApplication).to.not.have.been.called
    })

    it('skips an upstream that has no host', async () => {
      NatsConnectionManager.findAllWithNats.resolves([
        upstream('  ', 7422, 1),
        upstream(null, 7422, 2),
        upstream('10.0.0.2', 7422, 3)
      ])
      useAccount(7, 'billing', 'PUB_BILLING')

      const remotes = await NatsService._computeLeafRemotesForInstance(fog, natsInstance, transaction, certName)

      expect(remotes).to.have.length(1)
      expect(remotes[0].urls).to.eql(['tls://10.0.0.2:7422'])
    })
  })

  describe('downstream application accounts', () => {
    const transaction = {}
    const regional = { uuid: 'regional-agent', name: 'regional', host: '10.0.0.20', natsMicroserviceUuid: 'ms-regional' }
    const factory = { uuid: 'factory-agent', name: 'factory' }
    const plant = { uuid: 'plant-agent', name: 'plant' }
    const regionalNats = { id: 20, isLeaf: true, iofogUuid: regional.uuid, host: '10.0.0.20', leafPort: 7422 }
    const factoryNats = { id: 21, isLeaf: true, iofogUuid: factory.uuid, host: '10.0.0.21', leafPort: 7422 }
    const plantNats = { id: 22, isLeaf: true, iofogUuid: plant.uuid, host: '10.0.0.22', leafPort: 7422 }
    const hubNats = { id: 1, isLeaf: false, isHub: true, iofogUuid: 'hub-agent', host: '10.0.0.1', leafPort: 7422 }
    const appA = { id: 7, name: 'billing', isSystem: false, natsAccess: true }
    const appB = { id: 8, name: 'telemetry', isSystem: false, natsAccess: true }
    const systemApp = { id: 9, name: 'system-factory', isSystem: true, natsAccess: true }
    let factoryMicroservices
    let plantMicroservices
    let includePlant

    beforeEach(() => {
      factoryMicroservices = [{ applicationId: appA.id }, { applicationId: systemApp.id }]
      plantMicroservices = [{ applicationId: appB.id }]
      includePlant = false
      $sandbox.stub(NatsInstanceManager, 'findByFog').callsFake((uuid) => {
        if (uuid === regional.uuid) return Promise.resolve(regionalNats)
        if (uuid === factory.uuid) return Promise.resolve(factoryNats)
        if (uuid === plant.uuid) return Promise.resolve(plantNats)
        return Promise.resolve(null)
      })
      $sandbox.stub(NatsConnectionManager, 'findAllWithNats').callsFake((query) => {
        if (query.sourceNats === regionalNats.id) {
          return Promise.resolve([{ dest: hubNats }])
        }
        if (query.destNats === regionalNats.id) {
          return Promise.resolve([{ source: factoryNats }])
        }
        if (query.destNats === factoryNats.id) {
          return Promise.resolve(includePlant ? [{ source: plantNats }] : [])
        }
        return Promise.resolve([])
      })
      $sandbox.stub(NatsConnectionManager, 'create').resolves()
      $sandbox.stub(MicroserviceManager, 'findAll').callsFake((query) => {
        if (query.iofogUuid === factory.uuid) return Promise.resolve(factoryMicroservices)
        if (query.iofogUuid === plant.uuid) return Promise.resolve(plantMicroservices)
        return Promise.resolve([])
      })
      $sandbox.stub(ApplicationManager, 'findOne').callsFake((query) => {
        if (query.id === appA.id) return Promise.resolve(appA)
        if (query.id === appB.id) return Promise.resolve(appB)
        if (query.id === systemApp.id) return Promise.resolve(systemApp)
        return Promise.resolve(null)
      })
      $sandbox.stub(NatsAuthService, 'ensureAccountForApplication').callsFake((appId) => {
        if (appId === appA.id) {
          return Promise.resolve({ id: 70, name: 'billing', publicKey: 'PUB_BILLING', jwt: 'billing.jwt' })
        }
        if (appId === appB.id) {
          return Promise.resolve({ id: 80, name: 'telemetry', publicKey: 'PUB_TELEMETRY', jwt: 'telemetry.jwt' })
        }
        return Promise.resolve({ id: 90, name: 'system-factory', publicKey: 'PUB_SYSTEM', jwt: 'system.jwt' })
      })
      $sandbox.stub(NatsAuthService, 'ensureLeafSystemAccount').callsFake((fog) => {
        if (fog && fog.uuid === factory.uuid) {
          return Promise.resolve({ publicKey: 'FACTORY_SYS', jwt: 'factory-sys.jwt' })
        }
        return Promise.resolve({ publicKey: 'REGIONAL_SYS', jwt: 'regional-sys.jwt' })
      })
      $sandbox.stub(NatsAuthService, 'ensureLeafUserForAccount').resolves({
        user: { name: 'leaf-regional', credsSecretName: 'creds-regional' }
      })
      $sandbox.stub(NatsAuthService, 'ensureLeafSystemAccountUser').resolves({
        account: { name: 'SYS-leaf-regional' },
        user: { name: 'leaf-regional', credsSecretName: 'creds-sys' }
      })
      $sandbox.stub(SecretService, 'getSecretEndpoint').resolves({
        data: { 'billing/leaf-regional.creds': 'regional-cred-body' }
      })
      $sandbox.stub(ConfigMapManager, 'getConfigMap').resolves(null)
      $sandbox.stub(ConfigMapService, 'createConfigMapEndpoint').resolves()
      $sandbox.stub(ConfigMapService, 'updateConfigMapEndpoint').resolves()
      $sandbox.stub(VolumeMountService, 'getVolumeMountEndpoint').resolves({ name: 'mount' })
      $sandbox.stub(VolumeMountService, 'linkVolumeMountEndpoint').resolves()
      $sandbox.stub(VolumeMappingManager, 'findOne').resolves({ id: 1 })
      $sandbox.stub(ChangeTrackingService, 'update').resolves()
    })

    it('bridges a child application toward the hub with the parent leaf user', async () => {
      const bundle = await NatsService._buildJwtBundle(regional, true, transaction)
      const remotes = await NatsService._computeLeafRemotesForInstance(regional, regionalNats, transaction, 'nats-server-regional')

      expect(bundle['PUB_BILLING.jwt']).to.equal('billing.jwt')
      expect(bundle['REGIONAL_SYS.jwt']).to.equal('regional-sys.jwt')
      expect(remotes).to.have.length(1)
      expect(remotes[0].account).to.equal('PUB_BILLING')
      expect(remotes[0].urls).to.eql(['tls://10.0.0.1:7422'])
      expect(remotes[0].credentials).to.equal('/etc/nats/creds/billing/leaf-regional.creds')
      expect(remotes[0].credentials).to.not.include('factory')
      expect(NatsAuthService.ensureAccountForApplication).to.not.have.been.calledWith(systemApp.id)
    })

    it('writes the parent leaf user into the parent creds for a child-only account', async () => {
      await NatsService._buildLeafCredsConfigMap(regional, regionalNats, transaction)

      expect(NatsAuthService.ensureLeafUserForAccount).to.have.been.calledWith(
        70,
        'regional',
        transaction,
        regional.natsMicroserviceUuid
      )
      const created = ConfigMapService.createConfigMapEndpoint.firstCall.args[0]
      expect(created.data['billing/leaf-regional.creds']).to.equal('regional-cred-body')
      expect(Object.keys(created.data).some((key) => key.includes('factory'))).to.equal(false)
      expect(ChangeTrackingService.update).to.have.been.calledWith(
        regional.uuid,
        ChangeTrackingService.events.microserviceList,
        transaction
      )
    })

    it('bridges a grandchild application and omits the child leaf system account', async () => {
      includePlant = true

      const bundle = await NatsService._buildJwtBundle(regional, true, transaction)

      expect(bundle['PUB_BILLING.jwt']).to.equal('billing.jwt')
      expect(bundle['PUB_TELEMETRY.jwt']).to.equal('telemetry.jwt')
      expect(bundle['FACTORY_SYS.jwt']).to.equal(undefined)
      expect(bundle['REGIONAL_SYS.jwt']).to.equal('regional-sys.jwt')
      expect(NatsAuthService.ensureLeafSystemAccount).to.have.been.calledOnce
      expect(NatsAuthService.ensureLeafSystemAccount).to.have.been.calledWith(regional, transaction)
    })

    it('keeps a downstream account in the bundle when the parent has no upstream', async () => {
      NatsConnectionManager.findAllWithNats.callsFake((query) => {
        if (query.destNats === regionalNats.id) {
          return Promise.resolve([{ source: factoryNats }])
        }
        return Promise.resolve([])
      })

      const bundle = await NatsService._buildJwtBundle(regional, true, transaction)
      const remotes = await NatsService._computeLeafRemotesForInstance(regional, regionalNats, transaction, 'nats-server-regional')

      expect(bundle['PUB_BILLING.jwt']).to.equal('billing.jwt')
      expect(remotes).to.eql([])
      expect(NatsConnectionManager.create).to.not.have.been.called
    })

    it('drops a downstream application from the parent bundle and remote after the child microservice is removed', async () => {
      const beforeBundle = await NatsService._buildJwtBundle(regional, true, transaction)
      const beforeRemotes = await NatsService._computeLeafRemotesForInstance(regional, regionalNats, transaction, 'nats-server-regional')
      expect(beforeBundle['PUB_BILLING.jwt']).to.equal('billing.jwt')
      expect(beforeRemotes.map((remote) => remote.account)).to.eql(['PUB_BILLING'])

      factoryMicroservices = []
      const afterBundle = await NatsService._buildJwtBundle(regional, true, transaction)
      const afterRemotes = await NatsService._computeLeafRemotesForInstance(regional, regionalNats, transaction, 'nats-server-regional')

      expect(afterBundle['PUB_BILLING.jwt']).to.equal(undefined)
      expect(afterRemotes).to.eql([])
    })

    it('does not repeat an application when leaf dials loop', async () => {
      NatsConnectionManager.findAllWithNats.callsFake((query) => {
        if (query.sourceNats === regionalNats.id) {
          return Promise.resolve([{ dest: hubNats }])
        }
        if (query.destNats === regionalNats.id) {
          return Promise.resolve([{ source: factoryNats }])
        }
        if (query.destNats === factoryNats.id) {
          return Promise.resolve([{ source: regionalNats }])
        }
        return Promise.resolve([])
      })

      const bundle = await NatsService._buildJwtBundle(regional, true, transaction)

      expect(Object.keys(bundle).filter((key) => key === 'PUB_BILLING.jwt')).to.eql(['PUB_BILLING.jwt'])
    })

    it('includes ancestor leaves when an application runs on a downstream leaf', async () => {
      const national = { id: 23, isLeaf: true, iofogUuid: 'national-agent' }
      const otherServer = { id: 2, isLeaf: false, iofogUuid: 'server-b' }
      const bystander = { id: 30, isLeaf: true, iofogUuid: 'bystander' }
      const natsInstanceByFog = new Map([
        [hubNats.iofogUuid, hubNats],
        [otherServer.iofogUuid, otherServer],
        [national.iofogUuid, national],
        [regional.uuid, regionalNats],
        [factory.uuid, factoryNats],
        [bystander.iofogUuid, bystander]
      ])
      const microservicesByFog = new Map([
        [factory.uuid, [{ applicationId: appA.id }]]
      ])
      NatsConnectionManager.findAllWithNats.callsFake((query) => {
        if (query.sourceNats === factoryNats.id) {
          return Promise.resolve([{ dest: regionalNats }])
        }
        if (query.sourceNats === regionalNats.id) {
          return Promise.resolve([{ dest: national }])
        }
        if (query.sourceNats === national.id) {
          return Promise.resolve([{ dest: hubNats }])
        }
        return Promise.resolve([])
      })

      const affected = await NatsService._getAffectedFogUuidsForApplication(
        appA.id,
        natsInstanceByFog,
        microservicesByFog,
        transaction
      )

      expect(affected.has(factory.uuid)).to.equal(true)
      expect(affected.has(regional.uuid)).to.equal(true)
      expect(affected.has(national.iofogUuid)).to.equal(true)
      expect(affected.has(hubNats.iofogUuid)).to.equal(true)
      expect(affected.has(otherServer.iofogUuid)).to.equal(true)
      expect(affected.has(bystander.iofogUuid)).to.equal(false)
    })
  })

  describe('application account reconcile tasks', () => {
    const transaction = {}
    const factory = 'factory-agent'
    const regional = 'regional-agent'
    const national = 'national-agent'
    const hub = 'hub-agent'
    const otherServer = 'server-b'
    const bystander = 'bystander'
    const otherFactory = 'other-factory'
    const otherRegional = 'other-regional'
    const fogs = [factory, regional, national, hub, otherServer, bystander, otherFactory, otherRegional]
      .map((uuid) => ({ uuid }))
    const instances = [
      { id: 21, isLeaf: true, iofogUuid: factory },
      { id: 20, isLeaf: true, iofogUuid: regional },
      { id: 23, isLeaf: true, iofogUuid: national },
      { id: 1, isLeaf: false, iofogUuid: hub },
      { id: 2, isLeaf: false, iofogUuid: otherServer },
      { id: 30, isLeaf: true, iofogUuid: bystander },
      { id: 40, isLeaf: true, iofogUuid: otherFactory },
      { id: 41, isLeaf: true, iofogUuid: otherRegional }
    ]
    const upstream = {
      21: [{ dest: { id: 20, isLeaf: true, iofogUuid: regional } }],
      20: [{ dest: { id: 23, isLeaf: true, iofogUuid: national } }],
      23: [{ dest: { id: 1, isLeaf: false, iofogUuid: hub } }],
      40: [{ dest: { id: 41, isLeaf: true, iofogUuid: otherRegional } }],
      41: [{ dest: { id: 1, isLeaf: false, iofogUuid: hub } }]
    }
    const chain = [factory, regional, national, hub, otherServer]

    function taskFogUuids () {
      return NatsReconcileTaskManager.create.getCalls()
        .flatMap((call) => String(call.args[0].fogUuids || '').split(','))
        .map((uuid) => uuid.trim())
        .filter(Boolean)
    }

    beforeEach(() => {
      $sandbox.stub(FogManager, 'findAll').resolves(fogs)
      $sandbox.stub(NatsInstanceManager, 'findAll').resolves(instances)
      $sandbox.stub(MicroserviceManager, 'findAll').resolves([])
      $sandbox.stub(NatsConnectionManager, 'findAllWithNats').callsFake((query) => {
        return Promise.resolve(upstream[query.sourceNats] || [])
      })
      $sandbox.stub(NatsReconcileTaskManager, 'findAll').resolves([])
      $sandbox.stub(NatsReconcileTaskManager, 'getEntity').returns({ destroy: () => Promise.resolve() })
      $sandbox.stub(NatsReconcileTaskManager, 'create').resolves()
    })

    it('refreshes the leaf chain when application NATS access is turned off', async () => {
      MicroserviceManager.findAll.resolves([{ applicationId: 7, iofogUuid: factory }])

      await NatsService.enqueueReconcileTask({
        reason: 'account-deleted',
        applicationId: 7
      }, transaction)

      expect(taskFogUuids()).to.have.members(chain)
      expect(taskFogUuids()).to.not.include(bystander)
    })

    it('refreshes ancestor leaves when a microservice is created on a downstream leaf', async () => {
      await NatsService.enqueueReconcileTask({
        reason: 'account-created',
        applicationId: 7,
        fogUuids: [factory]
      }, transaction)

      expect(taskFogUuids()).to.have.members(chain)
      expect(taskFogUuids()).to.not.include(bystander)
    })

    it('refreshes ancestor leaves after the microservice row is gone', async () => {
      await NatsService.enqueueReconcileTask({
        reason: 'account-created',
        applicationId: 7,
        fogUuids: [factory]
      }, transaction)

      expect(taskFogUuids()).to.have.members(chain)
      expect(MicroserviceManager.findAll).to.have.been.called
    })

    it('refreshes both leaf chains when a microservice moves', async () => {
      await NatsService.enqueueReconcileTask({
        reason: 'account-created',
        applicationId: 7,
        fogUuids: [factory, otherFactory]
      }, transaction)

      expect(taskFogUuids()).to.have.members(chain.concat([otherFactory, otherRegional]))
      expect(taskFogUuids()).to.not.include(bystander)
    })

    it('keeps a removed agent when a later change for the same application is still pending', async () => {
      NatsReconcileTaskManager.findAll.resolves([{ fogUuids: otherFactory }])

      await NatsService.enqueueReconcileTask({
        reason: 'account-created',
        applicationId: 7,
        fogUuids: [factory]
      }, transaction)

      expect(taskFogUuids()).to.have.members(chain.concat([otherFactory, otherRegional]))
    })

    it('does not expand an explicit fog list for a cluster route change', async () => {
      await NatsService.enqueueReconcileTask({
        reason: 'cluster-routes-changed',
        fogUuids: [otherServer]
      }, transaction)

      expect(NatsReconcileTaskManager.create).to.have.been.calledOnce
      expect(NatsReconcileTaskManager.create.firstCall.args[0].fogUuids).to.equal(otherServer)
      expect(MicroserviceManager.findAll).to.not.have.been.called
      expect(NatsReconcileTaskManager.findAll).to.not.have.been.called
    })
  })

  describe('leaf broker config', () => {
    const fs = require('fs')
    const path = require('path')
    const transaction = {}
    const fog = {
      uuid: 'leaf-agent',
      name: 'edge-1',
      host: '10.0.0.10',
      natsMicroserviceUuid: 'ms-nats'
    }
    const natsInstance = {
      id: 10,
      isLeaf: true,
      serverPort: 4222,
      leafPort: 7422,
      clusterPort: 6222,
      mqttPort: 8883,
      httpPort: 8222
    }

    function leafTemplate () {
      return fs.readFileSync(path.join(__dirname, '../../../src/templates/nats/leaf.conf'), 'utf8')
    }

    function renderLeaf () {
      return NatsService._renderAndPersistNatsConfig(
        fog,
        natsInstance,
        'nats-server-edge-1',
        'nats-mqtt-edge-1',
        'nats-server-conf-edge-1',
        'server.conf',
        leafTemplate(),
        false,
        false,
        transaction
      )
    }

    beforeEach(() => {
      $sandbox.stub(NatsAuthService, 'ensureLeafSystemAccount').resolves({ publicKey: 'SYSLEAF' })
      $sandbox.stub(NatsAuthService, 'ensureSystemAccount').resolves({ publicKey: 'SYS' })
      $sandbox.stub(NatsAuthService, 'ensureOperator').resolves({ jwt: 'op-jwt' })
      $sandbox.stub(SecretService, 'getSecretEndpoint').resolves({ data: { jsk: 'jet-key' } })
      $sandbox.stub(NatsConnectionManager, 'findAllWithNats').resolves([])
      $sandbox.stub(ConfigMapManager, 'getConfigMap').resolves(null)
      $sandbox.stub(ConfigMapService, 'createConfigMapEndpoint').resolves()
      $sandbox.stub(ConfigMapService, 'updateConfigMapEndpoint').resolves()
      $sandbox.stub(MicroserviceManager, 'update').resolves()
      $sandbox.stub(ChangeTrackingService, 'update').resolves()
    })

    it('keeps the leaf domain as the agent name and the server domain as the controller namespace', async () => {
      const previousNamespace = process.env.CONTROLLER_NAMESPACE
      process.env.CONTROLLER_NAMESPACE = 'plant-ns'
      try {
        const leafRendered = await renderLeaf()
        expect(leafRendered).to.include('domain: "edge-1"')
        expect(leafRendered).to.not.include('plant-ns')

        NatsConnectionManager.findAllWithNats.resolves([])
        const serverRendered = await NatsService._renderAndPersistNatsConfig(
          { uuid: 'hub-agent', name: 'hub', host: '10.0.0.1', natsMicroserviceUuid: 'ms-hub' },
          {
            id: 1,
            isLeaf: false,
            host: '10.0.0.1',
            serverPort: 4222,
            leafPort: 7422,
            clusterPort: 6222,
            mqttPort: 8883,
            httpPort: 8222
          },
          'nats-server-hub',
          'nats-mqtt-hub',
          'nats-server-conf-hub',
          'server.conf',
          leafTemplate(),
          true,
          true,
          transaction
        )

        expect(serverRendered).to.include('domain: "plant-ns"')
        expect(serverRendered).to.not.include('domain: "hub"')
      } finally {
        if (previousNamespace == null) {
          delete process.env.CONTROLLER_NAMESPACE
        } else {
          process.env.CONTROLLER_NAMESPACE = previousNamespace
        }
      }
    })

    it('renders a leaf listener with port, advertise, and tls verify', async () => {
      const rendered = await renderLeaf()

      expect(rendered).to.include('leafnodes:')
      expect(rendered).to.match(/port:\s*7422/)
      expect(rendered).to.include('advertise: 10.0.0.10')
      expect(rendered).to.include('verify: true')
      expect(rendered).to.include('handshake_first: true')
      expect(rendered).to.include('reconnect: "10s"')
      expect(rendered).to.include('remotes: []')
    })

    it('renders a server with an empty leaf remote list', async () => {
      NatsConnectionManager.findAllWithNats.resolves([
        { dest: { id: 2, isLeaf: false, host: '10.0.0.2', clusterPort: 6222, leafPort: 7422 } }
      ])
      $sandbox.stub(NatsAuthService, 'ensureAccountForApplication').rejects(new Error('servers do not dial leaf remotes'))
      const server = {
        id: 1,
        isLeaf: false,
        host: '10.0.0.1',
        serverPort: 4222,
        leafPort: 7422,
        clusterPort: 6222,
        mqttPort: 8883,
        httpPort: 8222
      }

      const rendered = await NatsService._renderAndPersistNatsConfig(
        { uuid: 'hub-agent', name: 'hub', host: '10.0.0.1', natsMicroserviceUuid: 'ms-hub' },
        server,
        'nats-server-hub',
        'nats-mqtt-hub',
        'nats-server-conf-hub',
        'server.conf',
        leafTemplate(),
        false,
        true,
        transaction
      )

      expect(rendered).to.include('cluster:')
      expect(rendered).to.include('nats://10.0.0.2:6222')
      expect(rendered).to.not.include('remotes:')
      expect(rendered).to.not.include('tls://')
      expect(NatsAuthService.ensureAccountForApplication).to.not.have.been.called
    })

    it('writes a changed leaf config without rebuilding the container', async () => {
      ConfigMapManager.getConfigMap.resolves({ data: { 'server.conf': 'port: 1\n' } })

      await renderLeaf()

      expect(ConfigMapService.updateConfigMapEndpoint).to.have.been.calledOnce
      expect(MicroserviceManager.update).to.not.have.been.called
      expect(ChangeTrackingService.update).to.not.have.been.called
    })

    it('does not restart the leaf broker the first time its config is written', async () => {
      await renderLeaf()

      expect(ConfigMapService.createConfigMapEndpoint).to.have.been.calledOnce
      expect(MicroserviceManager.update).to.not.have.been.called
      expect(ChangeTrackingService.update).to.not.have.been.called
    })

    it('does not restart the leaf broker when the rendered config is unchanged', async () => {
      const rendered = await renderLeaf()
      ConfigMapManager.getConfigMap.resolves({ data: { 'server.conf': rendered } })
      MicroserviceManager.update.resetHistory()
      ChangeTrackingService.update.resetHistory()

      await renderLeaf()

      expect(ConfigMapService.updateConfigMapEndpoint).to.not.have.been.called
      expect(MicroserviceManager.update).to.not.have.been.called
      expect(ChangeTrackingService.update).to.not.have.been.called
    })
  })

  describe('operator JWT fields', () => {
    it('encodeOperator from @nats-io/jwt accepts account_server_url, operator_service_urls, system_account', async () => {
      const { createOperator, encodeOperator } = require('@nats-io/jwt')
      const kp = createOperator()
      const jwt = await encodeOperator('test-op', kp, {
        account_server_url: 'https://hub:4222',
        operator_service_urls: ['https://hub:4222'],
        system_account: 'ACTPUBKEY123'
      })
      expect(jwt).to.be.a('string')
      const payload = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString('utf8'))
      expect(payload.nats).to.include({ account_server_url: 'https://hub:4222', system_account: 'ACTPUBKEY123' })
      expect(payload.nats.operator_service_urls).to.eql(['https://hub:4222'])
    })
  })

  describe('K8s I/O outside transactions (R-04–R-06)', () => {
    const k8sClient = require('../../../src/utils/k8s-client')
    const config = require('../../../src/config')

    function loadNatsServiceWithTxStub (runInTransactionImpl) {
      const txRunnerPath = require.resolve('../../../src/helpers/transaction-runner')
      const natsPath = require.resolve('../../../src/services/nats-service')
      delete require.cache[natsPath]
      delete require.cache[txRunnerPath]
      const transactionRunner = require('../../../src/helpers/transaction-runner')
      $sandbox.stub(transactionRunner, 'runInTransaction').callsFake(runInTransactionImpl)
      return require('../../../src/services/nats-service')
    }

    function stubKubernetesControlPlane () {
      $sandbox.stub(config, 'get').callsFake((key, defaultValue) => {
        if (key === 'app.ControlPlane') return 'kubernetes'
        if (key === 'nats.enabled') return false
        return defaultValue
      })
    }

    function stubCleanupDb (NatsServiceFresh, natsInstance) {
      $sandbox.stub(NatsInstanceManager, 'findByFog').resolves(natsInstance)
      $sandbox.stub(NatsInstanceManager, 'findAll').resolves([])
      $sandbox.stub(NatsAccountManager, 'findOne').resolves({ id: 1, isSystem: true })
      $sandbox.stub(NatsUserManager, 'findOne').resolves({ credsSecretName: 'nats-creds-sys-admin' })
      $sandbox.stub(NatsConnectionManager, 'delete').resolves()
      $sandbox.stub(NatsInstanceManager, 'delete').resolves()
      $sandbox.stub(NatsAuthService, 'deleteServerSysUserForFog').resolves()
      $sandbox.stub(MicroserviceManager, 'findAll').resolves([])
      $sandbox.stub(VolumeMappingManager, 'delete').resolves()
      $sandbox.stub(VolumeMountService, 'unlinkVolumeMountEndpoint').resolves()
      $sandbox.stub(VolumeMountService, 'findVolumeMountedFogNodes').resolves([])
      $sandbox.stub(VolumeMountService, 'deleteVolumeMountEndpoint').resolves()
      $sandbox.stub(ConfigMapService, 'deleteConfigMapEndpoint').resolves()
      $sandbox.stub(SecretService, 'deleteSecretEndpoint').resolves()
      return NatsServiceFresh
    }

    it('cleanupNatsForFog applies K8s patch and rollout after runInTransaction', async () => {
      stubKubernetesControlPlane()
      const fog = { uuid: 'fog-1', name: 'local-agent' }
      const natsInstance = { id: 77, isLeaf: false, isHub: false }
      const callOrder = []
      const txLabels = []

      const NatsServiceFresh = loadNatsServiceWithTxStub(async (fn, runOptions = {}) => {
        if (runOptions.label) {
          txLabels.push(runOptions.label)
        }
        callOrder.push('tx-start')
        const result = await fn({})
        callOrder.push('tx-end')
        return result
      })
      stubCleanupDb(NatsServiceFresh, natsInstance)
      $sandbox.stub(k8sClient, 'getConfigMap').callsFake(async () => {
        callOrder.push('k8s-get')
        return { data: { 'server.conf': 'routes: []' } }
      })
      $sandbox.stub(k8sClient, 'patchConfigMap').callsFake(async () => {
        callOrder.push('k8s-patch')
      })
      $sandbox.stub(k8sClient, 'rolloutStatefulSet').callsFake(async () => {
        callOrder.push('k8s-rollout')
      })

      await NatsServiceFresh.cleanupNatsForFog(fog)

      expect(txLabels).to.deep.equal(['nats.cleanupForFog'])
      expect(callOrder).to.deep.equal(['tx-start', 'tx-end', 'k8s-get', 'k8s-patch', 'k8s-rollout'])
    })

    it('cleanupNatsForFog reuses parent transaction when provided', async () => {
      const fog = { uuid: 'fog-1', name: 'local-agent' }
      const parentTx = {
        commit: $sandbox.stub(),
        rollback: $sandbox.stub(),
        afterCommit: $sandbox.stub()
      }
      const txLabels = []
      const natsInstance = { id: 77, isLeaf: false, isHub: false }

      const NatsServiceFresh = loadNatsServiceWithTxStub(async (fn, runOptions = {}) => {
        if (runOptions.label) {
          txLabels.push(runOptions.label)
        }
        return fn({})
      })
      stubCleanupDb(NatsServiceFresh, natsInstance)

      await NatsServiceFresh.cleanupNatsForFog(fog, parentTx)

      expect(txLabels).to.deep.equal([])
      expect(parentTx.afterCommit).to.have.been.calledOnce
    })

    it('ensureNatsForFog uses phased cert-prep, auth-prep, and topology transaction labels', async () => {
      const txLabels = []

      const NatsServiceFresh = loadNatsServiceWithTxStub(async (fn, runOptions = {}) => {
        if (runOptions.label) {
          txLabels.push(runOptions.label)
        }
        if (runOptions.label === 'nats.ensure.certPrep') {
          return {
            serverCertName: 'nats-server-local-agent',
            mqttCertName: 'nats-mqtt-server-local-agent',
            jetstreamKey: { secretName: 'jsk', jsk: 'key' }
          }
        }
        if (runOptions.label === 'nats.ensure.authPrep') {
          return {
            mode: 'leaf',
            isHub: false,
            isLeaf: true,
            serverPort: 4222,
            leafPort: 7422,
            clusterPort: 6222,
            mqttPort: 1883,
            httpPort: 8222,
            configMapName: 'nats-server-conf-local-agent',
            configKey: 'server.conf',
            template: 'leaf',
            jwtBundleConfigMapName: 'nats-jwt-bundle-local-agent',
            sysCredsSecretName: null
          }
        }
        if (runOptions.label === 'nats.ensure.topology') {
          return { microservice: { uuid: 'ms-1' }, k8sHubPatch: null }
        }
        return fn({})
      })

      await NatsServiceFresh.ensureNatsForFog(
        { uuid: 'fog-1', name: 'local-agent' },
        { mode: 'leaf' }
      )

      expect(txLabels).to.deep.equal(['nats.ensure.certPrep', 'nats.ensure.authPrep', 'nats.ensure.topology'])
    })

    it('rolls the NATS StatefulSet after a hub route patch that removes a peer', async () => {
      stubKubernetesControlPlane()
      const callOrder = []
      const NatsServiceFresh = loadNatsServiceWithTxStub(async (fn, runOptions = {}) => {
        if (runOptions.label === 'nats.ensure.certPrep') {
          return { serverCertName: 'cert', mqttCertName: 'mqtt', jetstreamKey: { secretName: 'jsk', jsk: 'key' } }
        }
        if (runOptions.label === 'nats.ensure.authPrep') {
          return { mode: 'leaf', isHub: false, isLeaf: true }
        }
        if (runOptions.label === 'nats.ensure.topology') {
          return {
            microservice: { uuid: 'ms-1' },
            k8sHubPatch: ['nats://10.0.0.1:6222'],
            k8sRollout: true
          }
        }
        return fn({})
      })
      $sandbox.stub(k8sClient, 'getConfigMap').callsFake(async () => {
        callOrder.push('k8s-get')
        return { data: { 'server.conf': 'routes: ["nats://10.0.0.1:6222","nats://10.0.0.2:6222"]' } }
      })
      $sandbox.stub(k8sClient, 'patchConfigMap').callsFake(async () => {
        callOrder.push('k8s-patch')
      })
      $sandbox.stub(k8sClient, 'rolloutStatefulSet').callsFake(async () => {
        callOrder.push('k8s-rollout')
      })

      await NatsServiceFresh.ensureNatsForFog({ uuid: 'fog-1', name: 'local-agent' }, { mode: 'leaf' })

      expect(callOrder).to.deep.equal(['k8s-get', 'k8s-patch', 'k8s-rollout'])
      expect(k8sClient.rolloutStatefulSet).to.have.been.calledOnceWith('nats')
    })

    it('patches hub routes without rolling when a peer joins an existing cluster', async () => {
      stubKubernetesControlPlane()
      const NatsServiceFresh = loadNatsServiceWithTxStub(async (fn, runOptions = {}) => {
        if (runOptions.label === 'nats.ensure.certPrep') {
          return { serverCertName: 'cert', mqttCertName: 'mqtt', jetstreamKey: { secretName: 'jsk', jsk: 'key' } }
        }
        if (runOptions.label === 'nats.ensure.authPrep') {
          return { mode: 'server', isHub: false, isLeaf: false }
        }
        if (runOptions.label === 'nats.ensure.topology') {
          return {
            microservice: { uuid: 'ms-1' },
            k8sHubPatch: ['nats://10.0.0.1:6222', 'nats://10.0.0.2:6222'],
            k8sRollout: false
          }
        }
        return fn({})
      })
      $sandbox.stub(k8sClient, 'getConfigMap').resolves({
        data: { 'server.conf': 'routes: ["nats://10.0.0.1:6222"]' }
      })
      $sandbox.stub(k8sClient, 'patchConfigMap').resolves()
      $sandbox.stub(k8sClient, 'rolloutStatefulSet').resolves()

      await NatsServiceFresh.ensureNatsForFog({ uuid: 'fog-1', name: 'local-agent' }, { mode: 'server' })

      expect(k8sClient.patchConfigMap).to.have.been.calledOnce
      expect(k8sClient.rolloutStatefulSet).to.not.have.been.called
    })

    it('reconcileResolverArtifacts applies JWT bundle K8s patch after runInTransaction', async () => {
      stubKubernetesControlPlane()
      const callOrder = []

      const NatsServiceFresh = loadNatsServiceWithTxStub(async (fn) => {
        callOrder.push('tx-start')
        const result = await fn({})
        callOrder.push('tx-end')
        return result
      })

      $sandbox.stub(require('../../../src/data/managers/iofog-manager'), 'findAll').resolves([])
      $sandbox.stub(require('../../../src/data/managers/application-manager'), 'findAll').resolves([])
      $sandbox.stub(NatsInstanceManager, 'findAll').resolves([])
      $sandbox.stub(NatsAccountRuleManager, 'findOne').resolves({ id: 1, name: 'default-account' })
      $sandbox.stub(NatsAccountManager, 'findOne').resolves({ id: 1, isSystem: true })
      $sandbox.stub(require('../../../src/services/nats-auth-service'), 'ensureSystemAccount').resolves()
      $sandbox.stub(NatsOperatorManager, 'findOne').resolves(null)
      $sandbox.stub(ConfigMapManager, 'getConfigMap').resolves(null)
      $sandbox.stub(ConfigMapService, 'createConfigMapEndpoint').resolves({ name: 'iofog-nats-jwt-bundle' })
      $sandbox.stub(k8sClient, 'getConfigMap').callsFake(async () => {
        callOrder.push('k8s-get')
        return null
      })
      $sandbox.stub(k8sClient, 'patchConfigMap').callsFake(async () => {
        callOrder.push('k8s-patch')
      })

      await NatsServiceFresh.reconcileResolverArtifacts({ fogUuids: [] })

      expect(callOrder).to.deep.equal(['tx-start', 'tx-end', 'k8s-get', 'k8s-patch'])
    })
  })

  describe('Kubernetes hub operator JWT', () => {
    const k8sClient = require('../../../src/utils/k8s-client')
    const config = require('../../../src/config')
    const hubConf = [
      '# Operator',
      'operator = OLDJWT',
      'system_account = SYS',
      'routes: ["nats://10.0.0.1:6222"]'
    ].join('\n')

    function loadNatsServiceWithTxStub (runInTransactionImpl) {
      const txRunnerPath = require.resolve('../../../src/helpers/transaction-runner')
      const natsPath = require.resolve('../../../src/services/nats-service')
      delete require.cache[natsPath]
      delete require.cache[txRunnerPath]
      const transactionRunner = require('../../../src/helpers/transaction-runner')
      $sandbox.stub(transactionRunner, 'runInTransaction').callsFake(runInTransactionImpl)
      return require('../../../src/services/nats-service')
    }

    function stubReconcileDb () {
      $sandbox.stub(config, 'get').callsFake((key, defaultValue) => {
        if (key === 'app.ControlPlane') return 'kubernetes'
        if (key === 'nats.enabled') return false
        return defaultValue
      })
      $sandbox.stub(FogManager, 'findAll').resolves([])
      $sandbox.stub(ApplicationManager, 'findAll').resolves([])
      $sandbox.stub(NatsInstanceManager, 'findAll').resolves([])
      $sandbox.stub(NatsAccountRuleManager, 'findOne').resolves({ id: 1, name: 'default-account' })
      $sandbox.stub(NatsAccountManager, 'findOne').resolves({ id: 1, publicKey: 'SYS', jwt: 'SYSJWT', isSystem: true })
      $sandbox.stub(NatsAuthService, 'ensureSystemAccount').resolves()
      $sandbox.stub(ConfigMapManager, 'getConfigMap').resolves(null)
      $sandbox.stub(ConfigMapService, 'createConfigMapEndpoint').resolves({ name: 'iofog-nats-jwt-bundle' })
    }

    it('replaces only the operator line and leaves routes intact', () => {
      const replaced = NatsService._replaceOperatorJwtLine(hubConf, 'NEWJWT')
      expect(replaced.status).to.equal('changed')
      expect(replaced.content).to.include('operator = NEWJWT')
      expect(replaced.content).to.include('routes: ["nats://10.0.0.1:6222"]')
      expect(replaced.content).to.not.include('OLDJWT')
    })

    it('reports an unchanged operator line', () => {
      const replaced = NatsService._replaceOperatorJwtLine(hubConf, 'OLDJWT')
      expect(replaced.status).to.equal('unchanged')
      expect(replaced.content).to.equal(undefined)
    })

    it('patches the hub operator line without rolling the StatefulSet', async () => {
      stubReconcileDb()
      $sandbox.stub(NatsOperatorManager, 'findOne').resolves({ jwt: 'NEWJWT' })
      const NatsServiceFresh = loadNatsServiceWithTxStub(async (fn) => fn({}))
      $sandbox.stub(k8sClient, 'getConfigMap').callsFake(async (name) => {
        if (name === 'iofog-nats-config') {
          return { data: { 'server.conf': hubConf } }
        }
        return { data: { 'SYS.jwt': 'SYSJWT' } }
      })
      $sandbox.stub(k8sClient, 'patchConfigMap').resolves()
      $sandbox.stub(k8sClient, 'rolloutStatefulSet').resolves()

      await NatsServiceFresh.reconcileResolverArtifacts({})

      const operatorPatch = k8sClient.patchConfigMap.getCalls().find((call) => call.args[0] === 'iofog-nats-config')
      expect(operatorPatch).to.not.equal(undefined)
      expect(operatorPatch.args[1].data['server.conf']).to.include('operator = NEWJWT')
      expect(operatorPatch.args[1].data['server.conf']).to.include('routes: ["nats://10.0.0.1:6222"]')
      expect(k8sClient.rolloutStatefulSet).to.not.have.been.called
    })

    it('does not patch the hub config when the operator line already matches', async () => {
      stubReconcileDb()
      $sandbox.stub(NatsOperatorManager, 'findOne').resolves({ jwt: 'OLDJWT' })
      const NatsServiceFresh = loadNatsServiceWithTxStub(async (fn) => fn({}))
      $sandbox.stub(k8sClient, 'getConfigMap').callsFake(async (name) => {
        if (name === 'iofog-nats-config') {
          return { data: { 'server.conf': hubConf } }
        }
        return { data: { 'SYS.jwt': 'SYSJWT' } }
      })
      $sandbox.stub(k8sClient, 'patchConfigMap').resolves()
      $sandbox.stub(k8sClient, 'rolloutStatefulSet').resolves()

      await NatsServiceFresh.reconcileResolverArtifacts({})

      const operatorPatch = k8sClient.patchConfigMap.getCalls().find((call) => call.args[0] === 'iofog-nats-config')
      expect(operatorPatch).to.equal(undefined)
      expect(k8sClient.rolloutStatefulSet).to.not.have.been.called
    })

    it('returns when the hub ConfigMap does not exist yet', async () => {
      stubReconcileDb()
      $sandbox.stub(NatsOperatorManager, 'findOne').resolves({ jwt: 'NEWJWT' })
      const NatsServiceFresh = loadNatsServiceWithTxStub(async (fn) => fn({}))
      $sandbox.stub(k8sClient, 'getConfigMap').resolves(null)
      $sandbox.stub(k8sClient, 'patchConfigMap').resolves()
      $sandbox.stub(k8sClient, 'rolloutStatefulSet').resolves()

      await NatsServiceFresh.reconcileResolverArtifacts({})

      const operatorPatch = k8sClient.patchConfigMap.getCalls().find((call) => call.args[0] === 'iofog-nats-config')
      expect(operatorPatch).to.equal(undefined)
      expect(k8sClient.rolloutStatefulSet).to.not.have.been.called
    })

    it('retries the operator line patch once after a conflict', async () => {
      stubReconcileDb()
      $sandbox.stub(NatsOperatorManager, 'findOne').resolves({ jwt: 'NEWJWT' })
      const NatsServiceFresh = loadNatsServiceWithTxStub(async (fn) => fn({}))
      $sandbox.stub(k8sClient, 'getConfigMap').callsFake(async (name) => {
        if (name === 'iofog-nats-config') {
          return { data: { 'server.conf': hubConf } }
        }
        return { data: { 'SYS.jwt': 'SYSJWT' } }
      })
      const conflict = Object.assign(new Error('conflict'), { code: 409 })
      let operatorAttempts = 0
      $sandbox.stub(k8sClient, 'patchConfigMap').callsFake(async (name) => {
        if (name !== 'iofog-nats-config') return
        operatorAttempts += 1
        if (operatorAttempts === 1) {
          throw conflict
        }
      })
      $sandbox.stub(k8sClient, 'rolloutStatefulSet').resolves()

      await NatsServiceFresh.reconcileResolverArtifacts({})

      const operatorPatches = k8sClient.patchConfigMap.getCalls().filter((call) => call.args[0] === 'iofog-nats-config')
      expect(operatorPatches).to.have.length(2)
      expect(k8sClient.rolloutStatefulSet).to.not.have.been.called
    })
  })
})
