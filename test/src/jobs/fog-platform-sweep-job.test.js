const { expect } = require('chai')
const sinon = require('sinon')

const ClusterControllerService = require('../../../src/services/cluster-controller-service')
const FogPlatformSpecManager = require('../../../src/data/managers/fog-platform-spec-manager')
const FogPlatformStatusManager = require('../../../src/data/managers/fog-platform-status-manager')
const FogPlatformReconcileTaskManager = require('../../../src/data/managers/fog-platform-reconcile-task-manager')
const ServicePlatformReconcileTaskManager = require('../../../src/data/managers/service-platform-reconcile-task-manager')
const FogManager = require('../../../src/data/managers/iofog-manager')
const ServiceManager = require('../../../src/data/managers/service-manager')
const RouterManager = require('../../../src/data/managers/router-manager')
const NatsInstanceManager = require('../../../src/data/managers/nats-instance-manager')
const IofogService = require('../../../src/services/iofog-service')
const ServicesService = require('../../../src/services/services-service')
const K8sClient = require('../../../src/utils/k8s-client')
const databaseProvider = require('../../../src/data/providers/database-factory')
const FogPlatformSweepJob = require('../../../src/jobs/fog-platform-sweep-job')

describe('fog-platform-sweep-job', () => {
  def('sandbox', () => sinon.createSandbox())
  const transaction = {}

  afterEach(() => $sandbox.restore())

  it('skips sweep when controller uuid is not initialized', async () => {
    $sandbox.stub(ClusterControllerService, 'getCurrentControllerUuid').returns(null)
    $sandbox.stub(FogPlatformSpecManager, 'findAll')

    const result = await FogPlatformSweepJob.runSweep(transaction)

    expect(result).to.eql({ fogEnqueued: 0, serviceEnqueued: 0 })
    expect(FogPlatformSpecManager.findAll).to.not.have.been.called
  })

  it('enqueues fog reconcile on generation drift', async () => {
    $sandbox.stub(ClusterControllerService, 'getCurrentControllerUuid').returns('controller-1')
    $sandbox.stub(FogPlatformSpecManager, 'findAll').resolves([{ fogUuid: 'fog-1', generation: 3 }])
    $sandbox.stub(FogPlatformSpecManager, 'getParsedSpec').resolves({
      fogUuid: 'fog-1',
      generation: 3,
      spec: { routerMode: 'edge', natsMode: 'leaf' }
    })
    $sandbox.stub(FogPlatformStatusManager, 'getParsedStatus').resolves({
      phase: 'Ready',
      observedGeneration: 2
    })
    $sandbox.stub(FogPlatformReconcileTaskManager, 'getEntity').returns({
      findOne: $sandbox.stub().resolves(null)
    })
    $sandbox.stub(FogPlatformReconcileTaskManager, 'enqueueFogPlatformReconcileTask').resolves()
    $sandbox.stub(ServiceManager, 'findAllWithTags').resolves([])

    const result = await FogPlatformSweepJob.runSweep(transaction)

    expect(result.fogEnqueued).to.equal(1)
    expect(FogPlatformReconcileTaskManager.enqueueFogPlatformReconcileTask).to.have.been.calledWith({
      fogUuid: 'fog-1',
      reason: 'periodic-sweep',
      specGeneration: 3
    }, transaction)
  })

  it('enqueues service reconcile when provisioning failed without active task', async () => {
    $sandbox.stub(ClusterControllerService, 'getCurrentControllerUuid').returns('controller-1')
    $sandbox.stub(FogPlatformSpecManager, 'findAll').resolves([])
    $sandbox.stub(ServiceManager, 'findAllWithTags').resolves([{
      name: 'api-gateway',
      type: 'microservice',
      resource: 'app.ms',
      bridgePort: 12345,
      targetPort: 8080,
      provisioningStatus: 'failed',
      tags: [{ value: 'site-a' }]
    }])
    $sandbox.stub(ServicePlatformReconcileTaskManager, 'getEntity').returns({
      findOne: $sandbox.stub().resolves(null)
    })
    $sandbox.stub(ServicePlatformReconcileTaskManager, 'enqueueServicePlatformReconcileTask').resolves()

    const result = await FogPlatformSweepJob.runSweep(transaction)

    expect(result.serviceEnqueued).to.equal(1)
    expect(ServicePlatformReconcileTaskManager.enqueueServicePlatformReconcileTask).to.have.been.calledWith({
      serviceName: 'api-gateway',
      reason: 'periodic-sweep',
      specSnapshot: sinon.match({
        name: 'api-gateway',
        tags: ['site-a']
      })
    }, transaction)
  })

  it('does not enqueue fog reconcile while delete is in progress', async () => {
    $sandbox.stub(ClusterControllerService, 'getCurrentControllerUuid').returns('controller-1')
    $sandbox.stub(FogPlatformSpecManager, 'findAll').resolves([{ fogUuid: 'fog-1', generation: 2 }])
    $sandbox.stub(FogPlatformSpecManager, 'getParsedSpec').resolves({
      fogUuid: 'fog-1',
      generation: 2,
      spec: { routerMode: 'edge', natsMode: 'leaf' }
    })
    $sandbox.stub(FogPlatformStatusManager, 'getParsedStatus').resolves({ phase: 'Deleting' })
    $sandbox.stub(FogPlatformReconcileTaskManager, 'enqueueFogPlatformReconcileTask')
    $sandbox.stub(ServiceManager, 'findAllWithTags').resolves([])

    const result = await FogPlatformSweepJob.runSweep(transaction)

    expect(result.fogEnqueued).to.equal(0)
    expect(FogPlatformReconcileTaskManager.enqueueFogPlatformReconcileTask).to.not.have.been.called
  })

  describe('runSweep transaction consistency', () => {
    it('uses the same transaction for drift check and enqueue', async () => {
      const sharedTransaction = { id: 'sweep-tx' }

      $sandbox.stub(ClusterControllerService, 'getCurrentControllerUuid').returns('controller-1')
      $sandbox.stub(FogPlatformSpecManager, 'findAll').resolves([{ fogUuid: 'fog-1', generation: 3 }])
      $sandbox.stub(FogPlatformSpecManager, 'getParsedSpec').resolves({
        fogUuid: 'fog-1',
        generation: 3,
        spec: { routerMode: 'edge', natsMode: 'leaf' }
      })
      $sandbox.stub(FogPlatformStatusManager, 'getParsedStatus').resolves({
        phase: 'Ready',
        observedGeneration: 2
      })
      $sandbox.stub(FogPlatformReconcileTaskManager, 'getEntity').returns({
        findOne: $sandbox.stub().resolves(null)
      })
      $sandbox.stub(FogPlatformReconcileTaskManager, 'enqueueFogPlatformReconcileTask').resolves()
      $sandbox.stub(ServiceManager, 'findAllWithTags').resolves([])

      await FogPlatformSweepJob.runSweep(sharedTransaction)

      expect(FogPlatformStatusManager.getParsedStatus).to.have.been.calledWith('fog-1', sharedTransaction)
      expect(FogPlatformReconcileTaskManager.enqueueFogPlatformReconcileTask).to.have.been.calledWith(
        sinon.match({ fogUuid: 'fog-1' }),
        sharedTransaction
      )
    })
  })

  describe('shouldEnqueueFogSweep()', () => {
    it('detects missing runtime rows', async () => {
      $sandbox.stub(FogPlatformSpecManager, 'getParsedSpec').resolves({
        generation: 1,
        spec: { routerMode: 'edge', natsMode: 'none' }
      })
      $sandbox.stub(FogPlatformStatusManager, 'getParsedStatus').resolves({
        phase: 'Ready',
        observedGeneration: 1
      })
      $sandbox.stub(FogPlatformReconcileTaskManager, 'getEntity').returns({
        findOne: $sandbox.stub().resolves(null)
      })
      $sandbox.stub(RouterManager, 'findOne').resolves(null)
      $sandbox.stub(NatsInstanceManager, 'findByFog').resolves(null)

      const shouldEnqueue = await FogPlatformSweepJob.shouldEnqueueFogSweep('fog-1', transaction)

      expect(shouldEnqueue).to.equal(true)
    })

    it('detects runtime mode drift against spec', async () => {
      $sandbox.stub(FogPlatformSpecManager, 'getParsedSpec').resolves({
        generation: 2,
        spec: { routerMode: 'interior', natsMode: 'server' }
      })
      $sandbox.stub(FogPlatformStatusManager, 'getParsedStatus').resolves({
        phase: 'Ready',
        observedGeneration: 2
      })
      $sandbox.stub(FogPlatformReconcileTaskManager, 'getEntity').returns({
        findOne: $sandbox.stub().resolves(null)
      })
      $sandbox.stub(RouterManager, 'findOne').resolves({ id: 7, isEdge: true })
      $sandbox.stub(NatsInstanceManager, 'findByFog').resolves({ id: 8, isLeaf: false })

      const shouldEnqueue = await FogPlatformSweepJob.shouldEnqueueFogSweep('fog-1', transaction)

      expect(shouldEnqueue).to.equal(true)
    })
  })

  describe('shouldEnqueueServiceSweep()', () => {
    it('detects hub drift for ready services', async () => {
      const service = {
        name: 'api-gateway',
        provisioningStatus: 'ready'
      }

      $sandbox.stub(ServicesService, 'checkKubernetesEnvironment').resolves(true)
      $sandbox.stub(K8sClient, 'getConfigMap').resolves({
        data: {
          'skrouterd.json': JSON.stringify([])
        }
      })
      $sandbox.stub(ServicePlatformReconcileTaskManager, 'getEntity').returns({
        findOne: $sandbox.stub().resolves(null)
      })

      const shouldEnqueue = await FogPlatformSweepJob.shouldEnqueueServiceSweep(service, transaction)

      expect(shouldEnqueue).to.equal(true)
    })
  })
})
