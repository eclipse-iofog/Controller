const { expect } = require('chai')
const sinon = require('sinon')

const ClusterControllerService = require('../../../src/services/cluster-controller-service')
const FogPlatformService = require('../../../src/services/fog-platform-service')
const ServicePlatformService = require('../../../src/services/service-platform-service')
const FogPlatformReconcileTaskManager = require('../../../src/data/managers/fog-platform-reconcile-task-manager')
const FogPlatformStatusManager = require('../../../src/data/managers/fog-platform-status-manager')
const ServicePlatformReconcileTaskManager = require('../../../src/data/managers/service-platform-reconcile-task-manager')
const ServiceManager = require('../../../src/data/managers/service-manager')
const FogManager = require('../../../src/data/managers/iofog-manager')
const transactionRunner = require('../../../src/helpers/transaction-runner')
const PlatformReconcileWorkerJob = require('../../../src/jobs/platform-reconcile-worker-job')

function stubRunInTransaction (sandbox, transaction = {}) {
  sandbox.stub(transactionRunner, 'runInTransaction').callsFake(async (fn) => fn(transaction))
}

describe('platform-reconcile-worker-job', () => {
  def('sandbox', () => sinon.createSandbox())

  afterEach(() => $sandbox.restore())

  it('runs fog reconcile and destroys the task on success', async () => {
    const task = { id: 11, fogUuid: 'fog-1', reason: 'spec-changed', attempts: 0 }
    const entity = { destroy: $sandbox.stub().resolves(1) }
    const transaction = {}

    $sandbox.stub(ClusterControllerService, 'getCurrentControllerUuid').returns('controller-1')
    $sandbox.stub(FogPlatformReconcileTaskManager, 'claimNextFogTask').resolves(task)
    $sandbox.stub(FogPlatformStatusManager, 'getParsedStatus').resolves({ phase: 'Ready' })
    $sandbox.stub(FogPlatformService, 'reconcileFog').resolves({ fogUuid: 'fog-1', phase: 'Ready' })
    $sandbox.stub(FogPlatformService, 'reconcileFogDelete')
    $sandbox.stub(FogPlatformReconcileTaskManager, 'getEntity').returns(entity)
    stubRunInTransaction($sandbox, transaction)

    await PlatformReconcileWorkerJob.processNextFogTask()

    expect(FogPlatformService.reconcileFog).to.have.been.calledOnceWith('fog-1')
    expect(FogPlatformService.reconcileFogDelete).to.not.have.been.called
    expect(entity.destroy).to.have.been.calledOnceWith({
      where: { id: 11 },
      transaction: sinon.match.any
    })
  })

  it('passes transaction into reconcileFog prepare phase from worker (no reconcileFog stub)', async () => {
    const task = { id: 14, fogUuid: 'fog-1', reason: 'spec-changed', attempts: 0 }
    const labels = []

    $sandbox.stub(ClusterControllerService, 'getCurrentControllerUuid').returns('controller-1')
    $sandbox.stub(FogPlatformReconcileTaskManager, 'claimNextFogTask').resolves(task)
    $sandbox.stub(FogPlatformStatusManager, 'getParsedStatus').resolves({ phase: 'Progressing' })
    $sandbox.stub(FogManager, 'findOneWithTags').resolves(null)
    $sandbox.stub(FogPlatformReconcileTaskManager, 'recordFogTaskFailure').resolves(task)
    $sandbox.stub(FogPlatformService, 'markReconcileFailed').resolves()
    $sandbox.stub(transactionRunner, 'runInTransaction').callsFake(async (fn, options = {}) => {
      labels.push(options.label)
      return fn({ id: 'worker-tx' })
    })

    await PlatformReconcileWorkerJob.processNextFogTask()

    expect(labels).to.include('fogPlatform.prepare')
    expect(FogManager.findOneWithTags).to.have.been.calledOnceWith(
      { uuid: 'fog-1' },
      { id: 'worker-tx' }
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
    stubRunInTransaction($sandbox)

    await PlatformReconcileWorkerJob.processNextFogTask()

    expect(FogPlatformService.reconcileFogDelete).to.have.been.calledOnceWith('fog-2')
    expect(FogPlatformService.reconcileFog).to.not.have.been.called
  })

  it('runs delete reconcile when platform phase is Deleting even if task reason is spec-changed', async () => {
    const task = { id: 15, fogUuid: 'fog-4', reason: 'spec-changed', attempts: 0 }
    const entity = { destroy: $sandbox.stub().resolves(1) }

    $sandbox.stub(ClusterControllerService, 'getCurrentControllerUuid').returns('controller-1')
    $sandbox.stub(FogPlatformReconcileTaskManager, 'claimNextFogTask').resolves(task)
    $sandbox.stub(FogPlatformStatusManager, 'getParsedStatus').resolves({ phase: 'Deleting' })
    $sandbox.stub(FogPlatformService, 'reconcileFogDelete').resolves({ fogUuid: 'fog-4', deleted: true })
    $sandbox.stub(FogPlatformService, 'reconcileFog')
    $sandbox.stub(FogPlatformReconcileTaskManager, 'getEntity').returns(entity)
    stubRunInTransaction($sandbox)

    await PlatformReconcileWorkerJob.processNextFogTask()

    expect(FogPlatformService.reconcileFogDelete).to.have.been.calledOnceWith('fog-4')
    expect(FogPlatformService.reconcileFog).to.not.have.been.called
  })

  it('runs delete reconcile when reconcileFog skips because fog is deleting', async () => {
    const task = { id: 16, fogUuid: 'fog-5', reason: 'manual-retry', attempts: 0 }
    const entity = { destroy: $sandbox.stub().resolves(1) }

    $sandbox.stub(ClusterControllerService, 'getCurrentControllerUuid').returns('controller-1')
    $sandbox.stub(FogPlatformReconcileTaskManager, 'claimNextFogTask').resolves(task)
    $sandbox.stub(FogPlatformStatusManager, 'getParsedStatus').resolves({ phase: 'Progressing' })
    $sandbox.stub(FogPlatformService, 'reconcileFog').resolves({ skipped: true, reason: 'deleting' })
    $sandbox.stub(FogPlatformService, 'reconcileFogDelete').resolves({ fogUuid: 'fog-5', deleted: true })
    $sandbox.stub(FogPlatformReconcileTaskManager, 'getEntity').returns(entity)
    stubRunInTransaction($sandbox)

    await PlatformReconcileWorkerJob.processNextFogTask()

    expect(FogPlatformService.reconcileFog).to.have.been.calledOnceWith('fog-5')
    expect(FogPlatformService.reconcileFogDelete).to.have.been.calledOnceWith('fog-5')
  })

  it('keeps Deleting phase when delete reconcile fails', async () => {
    const task = { id: 17, fogUuid: 'fog-6', reason: 'delete', attempts: 1 }
    const error = new Error('nats cleanup failed')

    $sandbox.stub(ClusterControllerService, 'getCurrentControllerUuid').returns('controller-1')
    $sandbox.stub(FogPlatformReconcileTaskManager, 'claimNextFogTask').resolves(task)
    $sandbox.stub(FogPlatformService, 'reconcileFogDelete').rejects(error)
    $sandbox.stub(FogPlatformReconcileTaskManager, 'recordFogTaskFailure').resolves(task)
    $sandbox.stub(FogPlatformStatusManager, 'setPhase').resolves()
    $sandbox.stub(FogPlatformService, 'markReconcileFailed')
    stubRunInTransaction($sandbox)

    await PlatformReconcileWorkerJob.processNextFogTask()

    expect(FogPlatformStatusManager.setPhase).to.have.been.calledOnceWith(
      'fog-6',
      'Deleting',
      { lastError: 'nats cleanup failed' },
      sinon.match.any
    )
    expect(FogPlatformService.markReconcileFailed).to.not.have.been.called
  })

  it('records failure and updates fog status when reconcile throws', async () => {
    const task = { id: 13, fogUuid: 'fog-3', reason: 'spec-changed', attempts: 2 }
    const error = new Error('router create failed')

    $sandbox.stub(ClusterControllerService, 'getCurrentControllerUuid').returns('controller-1')
    $sandbox.stub(FogPlatformReconcileTaskManager, 'claimNextFogTask').resolves(task)
    $sandbox.stub(FogPlatformStatusManager, 'getParsedStatus').resolves({ phase: 'Progressing' })
    $sandbox.stub(FogPlatformService, 'reconcileFog').rejects(error)
    $sandbox.stub(FogPlatformReconcileTaskManager, 'recordFogTaskFailure').resolves(task)
    $sandbox.stub(FogPlatformService, 'markReconcileFailed').resolves()
    stubRunInTransaction($sandbox)

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
    stubRunInTransaction($sandbox, transaction)

    await PlatformReconcileWorkerJob.processNextServiceTask()

    expect(ServicePlatformService.reconcileService).to.have.been.calledOnceWith('api-gateway', task)
    expect(entity.destroy).to.have.been.calledOnceWith({
      where: { id: 21 },
      transaction: sinon.match.any
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
    stubRunInTransaction($sandbox)

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
    stubRunInTransaction($sandbox)

    await PlatformReconcileWorkerJob.processNextServiceTask()

    expect(ServiceManager.update).to.have.been.calledOnceWith(
      { name: 'api-gateway' },
      { provisioningStatus: 'pending', provisioningError: 'LoadBalancer IP not assigned' },
      sinon.match.any
    )
  })
})
