const { expect } = require('chai')
const sinon = require('sinon')

const ClusterControllerService = require('../../../src/services/cluster-controller-service')
const FogPlatformService = require('../../../src/services/fog-platform-service')
const ServicePlatformService = require('../../../src/services/service-platform-service')
const FogPlatformReconcileTaskManager = require('../../../src/data/managers/fog-platform-reconcile-task-manager')
const ServicePlatformReconcileTaskManager = require('../../../src/data/managers/service-platform-reconcile-task-manager')
const ServiceManager = require('../../../src/data/managers/service-manager')
const FogManager = require('../../../src/data/managers/iofog-manager')
const databaseProvider = require('../../../src/data/providers/database-factory')
const PlatformReconcileWorkerJob = require('../../../src/jobs/platform-reconcile-worker-job')

describe('platform-reconcile-worker-job', () => {
  def('sandbox', () => sinon.createSandbox())

  afterEach(() => $sandbox.restore())

  it('runs fog reconcile and destroys the task on success', async () => {
    const task = { id: 11, fogUuid: 'fog-1', reason: 'spec-changed', attempts: 0 }
    const entity = { destroy: $sandbox.stub().resolves(1) }
    const transaction = {}

    $sandbox.stub(ClusterControllerService, 'getCurrentControllerUuid').returns('controller-1')
    $sandbox.stub(FogPlatformReconcileTaskManager, 'claimNextFogTask').resolves(task)
    $sandbox.stub(FogPlatformService, 'reconcileFog').resolves({ fogUuid: 'fog-1', phase: 'Ready' })
    $sandbox.stub(FogPlatformService, 'reconcileFogDelete')
    $sandbox.stub(FogPlatformReconcileTaskManager, 'getEntity').returns(entity)
    $sandbox.stub(databaseProvider.sequelize, 'transaction').callsFake(async (fn) => fn(transaction))

    await PlatformReconcileWorkerJob.processNextFogTask()

    expect(FogPlatformService.reconcileFog).to.have.been.calledOnceWith('fog-1')
    expect(FogPlatformService.reconcileFogDelete).to.not.have.been.called
    expect(entity.destroy).to.have.been.calledOnceWith({
      where: { id: 11 },
      transaction
    })
  })

  it('passes fakeTransaction into reconcileFog DB layer from worker (no reconcileFog stub)', async () => {
    const task = { id: 14, fogUuid: 'fog-1', reason: 'spec-changed', attempts: 0 }
    const appHelperPath = require.resolve('../../../src/helpers/app-helper')
    const decoratorPath = require.resolve('../../../src/decorators/transaction-decorator')
    const fogPlatformServicePath = require.resolve('../../../src/services/fog-platform-service')
    const workerPath = require.resolve('../../../src/jobs/platform-reconcile-worker-job')

    $sandbox.stub(require(appHelperPath), 'isTest').returns(false)
    delete require.cache[decoratorPath]
    delete require.cache[fogPlatformServicePath]
    delete require.cache[workerPath]
    const WorkerJob = require('../../../src/jobs/platform-reconcile-worker-job')

    $sandbox.stub(ClusterControllerService, 'getCurrentControllerUuid').returns('controller-1')
    $sandbox.stub(FogPlatformReconcileTaskManager, 'claimNextFogTask').resolves(task)
    $sandbox.stub(FogManager, 'findOneWithTags').resolves(null)
    $sandbox.stub(FogPlatformReconcileTaskManager, 'recordFogTaskFailure').resolves(task)
    const markFailedPath = require.resolve('../../../src/services/fog-platform-service')
    $sandbox.stub(require(markFailedPath), 'markReconcileFailed').resolves()
    $sandbox.stub(databaseProvider.sequelize, 'transaction').callsFake(async (fn) => fn({}))

    await WorkerJob.processNextFogTask()

    expect(FogManager.findOneWithTags).to.have.been.calledOnceWith(
      { uuid: 'fog-1' },
      sinon.match({ fakeTransaction: true })
    )
  })

  it('runs delete reconcile when task reason is delete', async () => {
    const task = { id: 12, fogUuid: 'fog-2', reason: 'delete', attempts: 0 }
    const entity = { destroy: $sandbox.stub().resolves(1) }

    $sandbox.stub(ClusterControllerService, 'getCurrentControllerUuid').returns('controller-1')
    $sandbox.stub(FogPlatformReconcileTaskManager, 'claimNextFogTask').resolves(task)
    $sandbox.stub(FogPlatformService, 'reconcileFogDelete').resolves({ fogUuid: 'fog-2', deleted: true })
    $sandbox.stub(FogPlatformService, 'reconcileFog')
    $sandbox.stub(FogPlatformReconcileTaskManager, 'getEntity').returns(entity)
    $sandbox.stub(databaseProvider.sequelize, 'transaction').callsFake(async (fn) => fn({}))

    await PlatformReconcileWorkerJob.processNextFogTask()

    expect(FogPlatformService.reconcileFogDelete).to.have.been.calledOnceWith('fog-2')
    expect(FogPlatformService.reconcileFog).to.not.have.been.called
  })

  it('records failure and updates fog status when reconcile throws', async () => {
    const task = { id: 13, fogUuid: 'fog-3', reason: 'spec-changed', attempts: 2 }
    const error = new Error('router create failed')

    $sandbox.stub(ClusterControllerService, 'getCurrentControllerUuid').returns('controller-1')
    $sandbox.stub(FogPlatformReconcileTaskManager, 'claimNextFogTask').resolves(task)
    $sandbox.stub(FogPlatformService, 'reconcileFog').rejects(error)
    $sandbox.stub(FogPlatformReconcileTaskManager, 'recordFogTaskFailure').resolves(task)
    $sandbox.stub(FogPlatformService, 'markReconcileFailed').resolves()
    $sandbox.stub(databaseProvider.sequelize, 'transaction').callsFake(async (fn) => fn({}))

    await PlatformReconcileWorkerJob.processNextFogTask()

    expect(FogPlatformReconcileTaskManager.recordFogTaskFailure).to.have.been.calledOnceWith(
      13,
      'router create failed',
      { attempts: 2 },
      sinon.match.any
    )
    expect(FogPlatformService.markReconcileFailed).to.have.been.calledOnceWith(
      'fog-3',
      error,
      sinon.match.any
    )
  })

  it('skips work when controller uuid is not initialized', async () => {
    $sandbox.stub(ClusterControllerService, 'getCurrentControllerUuid').returns(null)
    $sandbox.stub(FogPlatformReconcileTaskManager, 'claimNextFogTask')

    await PlatformReconcileWorkerJob.processNextFogTask()

    expect(FogPlatformReconcileTaskManager.claimNextFogTask).to.not.have.been.called
  })

  it('logs and continues when fog task claim fails', async () => {
    const claimError = new Error('database is locked')

    $sandbox.stub(ClusterControllerService, 'getCurrentControllerUuid').returns('controller-1')
    $sandbox.stub(FogPlatformReconcileTaskManager, 'claimNextFogTask').rejects(claimError)
    $sandbox.stub(FogPlatformService, 'reconcileFog')

    await PlatformReconcileWorkerJob.processNextFogTask()

    expect(FogPlatformService.reconcileFog).to.not.have.been.called
  })

  it('logs and continues when service task claim fails', async () => {
    const claimError = new Error('database is locked')

    $sandbox.stub(ClusterControllerService, 'getCurrentControllerUuid').returns('controller-1')
    $sandbox.stub(ServicePlatformReconcileTaskManager, 'claimNextServiceTask').rejects(claimError)
    $sandbox.stub(ServicePlatformService, 'reconcileService')

    await PlatformReconcileWorkerJob.processNextServiceTask()

    expect(ServicePlatformService.reconcileService).to.not.have.been.called
  })

  it('runs service reconcile and destroys the task on success', async () => {
    const task = { id: 21, serviceName: 'api-gateway', reason: 'spec-changed', attempts: 0 }
    const entity = { destroy: $sandbox.stub().resolves(1) }
    const transaction = {}

    $sandbox.stub(ClusterControllerService, 'getCurrentControllerUuid').returns('controller-1')
    $sandbox.stub(ServicePlatformReconcileTaskManager, 'claimNextServiceTask').resolves(task)
    $sandbox.stub(ServicePlatformService, 'reconcileService').resolves({
      serviceName: 'api-gateway',
      provisioningStatus: 'ready'
    })
    $sandbox.stub(ServicePlatformReconcileTaskManager, 'getEntity').returns(entity)
    $sandbox.stub(databaseProvider.sequelize, 'transaction').callsFake(async (fn) => fn(transaction))

    await PlatformReconcileWorkerJob.processNextServiceTask()

    expect(ServicePlatformService.reconcileService).to.have.been.calledOnceWith('api-gateway', task)
    expect(entity.destroy).to.have.been.calledOnceWith({
      where: { id: 21 },
      transaction
    })
  })

  it('does not destroy delete tasks because reconcileService removes them', async () => {
    const task = { id: 22, serviceName: 'api-gateway', reason: 'delete', attempts: 0 }

    $sandbox.stub(ClusterControllerService, 'getCurrentControllerUuid').returns('controller-1')
    $sandbox.stub(ServicePlatformReconcileTaskManager, 'claimNextServiceTask').resolves(task)
    $sandbox.stub(ServicePlatformService, 'reconcileService').resolves({ serviceName: 'api-gateway', isDelete: true })
    $sandbox.stub(ServicePlatformReconcileTaskManager, 'getEntity')

    await PlatformReconcileWorkerJob.processNextServiceTask()

    expect(ServicePlatformReconcileTaskManager.getEntity).to.not.have.been.called
  })

  it('records service failure and marks provisioning failed after max attempts', async () => {
    const task = { id: 23, serviceName: 'api-gateway', reason: 'spec-changed', attempts: 9 }
    const error = new Error('hub lock timeout')

    $sandbox.stub(ClusterControllerService, 'getCurrentControllerUuid').returns('controller-1')
    $sandbox.stub(ServicePlatformReconcileTaskManager, 'claimNextServiceTask').resolves(task)
    $sandbox.stub(ServicePlatformService, 'reconcileService').rejects(error)
    $sandbox.stub(ServicePlatformReconcileTaskManager, 'recordServiceTaskFailure').resolves(task)
    $sandbox.stub(ServiceManager, 'update').resolves()
    $sandbox.stub(databaseProvider.sequelize, 'transaction').callsFake(async (fn) => fn({}))

    await PlatformReconcileWorkerJob.processNextServiceTask()

    expect(ServicePlatformReconcileTaskManager.recordServiceTaskFailure).to.have.been.calledOnceWith(
      23,
      'hub lock timeout',
      { attempts: 9 },
      sinon.match.any
    )
    expect(ServiceManager.update).to.have.been.calledOnceWith(
      { name: 'api-gateway' },
      { provisioningStatus: 'failed', provisioningError: 'hub lock timeout' },
      sinon.match.any
    )
  })

  it('keeps service provisioning pending on retryable failure', async () => {
    const task = { id: 24, serviceName: 'api-gateway', reason: 'spec-changed', attempts: 2 }
    const error = new Error('LoadBalancer IP not assigned')

    $sandbox.stub(ClusterControllerService, 'getCurrentControllerUuid').returns('controller-1')
    $sandbox.stub(ServicePlatformReconcileTaskManager, 'claimNextServiceTask').resolves(task)
    $sandbox.stub(ServicePlatformService, 'reconcileService').rejects(error)
    $sandbox.stub(ServicePlatformReconcileTaskManager, 'recordServiceTaskFailure').resolves(task)
    $sandbox.stub(ServiceManager, 'update').resolves()
    $sandbox.stub(databaseProvider.sequelize, 'transaction').callsFake(async (fn) => fn({}))

    await PlatformReconcileWorkerJob.processNextServiceTask()

    expect(ServiceManager.update).to.have.been.calledOnceWith(
      { name: 'api-gateway' },
      { provisioningStatus: 'pending', provisioningError: 'LoadBalancer IP not assigned' },
      sinon.match.any
    )
  })
})
