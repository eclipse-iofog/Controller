const { expect } = require('chai')
const sinon = require('sinon')

const {
  FOG_PLATFORM_SPEC_MAX_BYTES,
  validateFogPlatformSpec,
  parseSpecJson,
  serializeSpecJson,
  parseSpecSnapshot,
  serializeSpecSnapshot
} = require('../../../src/schemas/fog-platform-spec')
const FogPlatformReconcileTaskManager = require('../../../src/data/managers/fog-platform-reconcile-task-manager')
const ServicePlatformReconcileTaskManager = require('../../../src/data/managers/service-platform-reconcile-task-manager')
const databaseProvider = require('../../../src/data/providers/database-factory')

describe('Fog platform spec schema', () => {
  it('validates a minimal platform spec subset', async () => {
    await validateFogPlatformSpec({
      routerMode: 'edge',
      natsMode: 'leaf',
      host: '10.0.0.1'
    })
  })

  it('rejects unknown platform spec fields', async () => {
    try {
      await validateFogPlatformSpec({ routerMode: 'edge', unknownField: true })
      throw new Error('expected validation to fail')
    } catch (error) {
      expect(error.name).to.equal('ValidationError')
    }
  })

  it('round-trips spec JSON through parse and serialize', () => {
    const spec = {
      routerMode: 'interior',
      natsMode: 'server',
      host: 'controlplane',
      upstreamRouters: ['edge-1'],
      tags: [{ value: 'site-a' }]
    }
    const serialized = serializeSpecJson(spec)
    expect(parseSpecJson(serialized)).to.eql(spec)
  })

  it('rejects specs larger than 16 KB', () => {
    const huge = { host: 'x'.repeat(FOG_PLATFORM_SPEC_MAX_BYTES) }
    expect(() => serializeSpecJson(huge)).to.throw('exceeds maximum size')
  })

  it('round-trips service spec snapshots', () => {
    const snapshot = {
      name: 'my-service',
      type: 'microservice',
      resource: 'app.ms',
      targetPort: 8080,
      tags: [{ value: 'site-a' }, { value: 'site-b' }]
    }
    const serialized = serializeSpecSnapshot(snapshot)
    expect(parseSpecSnapshot(serialized)).to.eql(snapshot)
  })
})

describe('Fog platform reconcile task enqueue', () => {
  def('sandbox', () => sinon.createSandbox())
  const transaction = {}

  afterEach(() => $sandbox.restore())

  it('coalesces duplicate pending tasks for the same fog', async () => {
    const existing = { id: 7, fogUuid: 'fog-1', reason: 'spec-changed', status: 'pending' }
    const entity = {
      findOne: $sandbox.stub().resolves(existing),
      update: $sandbox.stub().resolves([1])
    }

    $sandbox.stub(FogPlatformReconcileTaskManager, 'getEntity').returns(entity)
    $sandbox.stub(FogPlatformReconcileTaskManager, 'findOne').resolves({ ...existing, reason: 'manual-retry' })
    $sandbox.stub(FogPlatformReconcileTaskManager, 'create')

    const task = await FogPlatformReconcileTaskManager.enqueueFogPlatformReconcileTask({
      fogUuid: 'fog-1',
      reason: 'manual-retry',
      specGeneration: 3
    }, transaction)

    expect(entity.update).to.have.been.calledOnce
    expect(FogPlatformReconcileTaskManager.create).to.not.have.been.called
    expect(task.reason).to.equal('manual-retry')
  })

  it('creates a new task when no active task exists', async () => {
    const entity = {
      findOne: $sandbox.stub().resolves(null)
    }
    const created = { id: 1, fogUuid: 'fog-2', reason: 'spec-changed', status: 'pending' }

    $sandbox.stub(FogPlatformReconcileTaskManager, 'getEntity').returns(entity)
    $sandbox.stub(FogPlatformReconcileTaskManager, 'create').resolves(created)

    const task = await FogPlatformReconcileTaskManager.enqueueFogPlatformReconcileTask({
      fogUuid: 'fog-2',
      reason: 'spec-changed',
      specGeneration: 1
    }, transaction)

    expect(FogPlatformReconcileTaskManager.create).to.have.been.calledOnce
    expect(task).to.eql(created)
  })

  it('supersedes pending work with delete reason', async () => {
    const existing = { id: 9, fogUuid: 'fog-3', reason: 'spec-changed', status: 'in_progress' }
    const entity = {
      findOne: $sandbox.stub().resolves(existing),
      update: $sandbox.stub().resolves([1])
    }

    $sandbox.stub(FogPlatformReconcileTaskManager, 'getEntity').returns(entity)
    $sandbox.stub(FogPlatformReconcileTaskManager, 'findOne').resolves({ ...existing, reason: 'delete' })

    await FogPlatformReconcileTaskManager.enqueueFogPlatformReconcileTask({
      fogUuid: 'fog-3',
      reason: 'delete'
    }, transaction)

    expect(entity.update).to.have.been.calledWithMatch(
      { reason: 'delete' },
      sinon.match.has('where', { id: 9 })
    )
  })
})

describe('Fog platform reconcile task claim', () => {
  def('sandbox', () => sinon.createSandbox())
  const transaction = {}

  afterEach(() => $sandbox.restore())

  it('claims an available task atomically', async () => {
    const task = { id: 1, fogUuid: 'fog-1', status: 'pending' }
    const entity = {
      findOne: $sandbox.stub().resolves(task),
      update: $sandbox.stub().resolves([1])
    }

    $sandbox.stub(databaseProvider.sequelize, 'transaction').callsFake(async (fn) => fn(transaction))
    $sandbox.stub(FogPlatformReconcileTaskManager, 'getEntity').returns(entity)
    $sandbox.stub(FogPlatformReconcileTaskManager, 'findOne').resolves(task)

    const result = await FogPlatformReconcileTaskManager.claimNextFogTask('controller-1', 300)

    expect(result).to.eql(task)
    expect(entity.update).to.have.been.calledOnceWith(
      { leaderUuid: 'controller-1', claimedAt: sinon.match.date, status: 'in_progress' },
      sinon.match.has('where', sinon.match.has('id', 1))
    )
  })

  it('returns null when a concurrent claim wins the update', async () => {
    const task = { id: 2, fogUuid: 'fog-2', status: 'pending' }
    const entity = {
      findOne: $sandbox.stub().resolves(task),
      update: $sandbox.stub().resolves([0])
    }

    $sandbox.stub(databaseProvider.sequelize, 'transaction').callsFake(async (fn) => fn(transaction))
    $sandbox.stub(FogPlatformReconcileTaskManager, 'getEntity').returns(entity)
    $sandbox.stub(FogPlatformReconcileTaskManager, 'findOne')

    const result = await FogPlatformReconcileTaskManager.claimNextFogTask('controller-1', 300)

    expect(result).to.be.null
    expect(FogPlatformReconcileTaskManager.findOne).to.not.have.been.called
  })

  it('returns null when no task is eligible', async () => {
    const entity = {
      findOne: $sandbox.stub().resolves(null),
      update: $sandbox.stub()
    }

    $sandbox.stub(databaseProvider.sequelize, 'transaction').callsFake(async (fn) => fn(transaction))
    $sandbox.stub(FogPlatformReconcileTaskManager, 'getEntity').returns(entity)

    const result = await FogPlatformReconcileTaskManager.claimNextFogTask('controller-1', 300)

    expect(result).to.be.null
    expect(entity.update).to.not.have.been.called
  })

  it('retries claim on SQLITE_BUSY before succeeding', async () => {
    const task = { id: 3, fogUuid: 'fog-3', status: 'pending' }
    const entity = {
      findOne: $sandbox.stub().resolves(task),
      update: $sandbox.stub().resolves([1])
    }
    let txAttempts = 0

    $sandbox.stub(databaseProvider.sequelize, 'transaction').callsFake(async (fn) => {
      txAttempts++
      if (txAttempts < 2) {
        throw new Error('SQLITE_BUSY: database is locked')
      }
      return fn(transaction)
    })
    $sandbox.stub(FogPlatformReconcileTaskManager, 'getEntity').returns(entity)
    $sandbox.stub(FogPlatformReconcileTaskManager, 'findOne').resolves(task)

    const result = await FogPlatformReconcileTaskManager.claimNextFogTask('controller-1', 300)

    expect(result).to.eql(task)
    expect(txAttempts).to.equal(2)
  })

  it('reclaims stale in_progress tasks for another controller', async () => {
    const staleClaimedAt = new Date(Date.now() - 400 * 1000)
    const task = {
      id: 10,
      fogUuid: 'fog-stale',
      status: 'in_progress',
      leaderUuid: 'controller-a',
      claimedAt: staleClaimedAt
    }
    const reclaimedTask = {
      ...task,
      leaderUuid: 'controller-b',
      claimedAt: new Date(),
      status: 'in_progress'
    }
    const entity = {
      findOne: $sandbox.stub().resolves(task),
      update: $sandbox.stub().resolves([1])
    }

    $sandbox.stub(databaseProvider.sequelize, 'transaction').callsFake(async (fn) => fn(transaction))
    $sandbox.stub(FogPlatformReconcileTaskManager, 'getEntity').returns(entity)
    $sandbox.stub(FogPlatformReconcileTaskManager, 'findOne').resolves(reclaimedTask)

    const result = await FogPlatformReconcileTaskManager.claimNextFogTask('controller-b', 300)

    expect(result).to.eql(reclaimedTask)
    expect(entity.update).to.have.been.calledOnceWith(
      { leaderUuid: 'controller-b', claimedAt: sinon.match.date, status: 'in_progress' },
      sinon.match.has('where', sinon.match({ id: 10 }))
    )
  })

  it('records retryable failure with backoff', async () => {
    const entity = {
      update: $sandbox.stub().resolves([1])
    }
    const updatedTask = {
      id: 5,
      attempts: 1,
      status: 'pending',
      lastError: 'router failed'
    }

    $sandbox.stub(FogPlatformReconcileTaskManager, 'getEntity').returns(entity)
    $sandbox.stub(FogPlatformReconcileTaskManager, 'findOne').resolves(updatedTask)

    const result = await FogPlatformReconcileTaskManager.recordFogTaskFailure(
      5,
      'router failed',
      { attempts: 0 },
      transaction
    )

    expect(entity.update).to.have.been.calledOnceWith(
      sinon.match({
        attempts: 1,
        lastError: 'router failed',
        status: 'pending',
        leaderUuid: null,
        claimedAt: null,
        nextAttemptAt: sinon.match.date
      }),
      sinon.match.has('where', { id: 5 })
    )
    expect(result).to.eql(updatedTask)
  })

  it('marks task failed permanently after max attempts', async () => {
    const entity = {
      update: $sandbox.stub().resolves([1])
    }

    $sandbox.stub(FogPlatformReconcileTaskManager, 'getEntity').returns(entity)
    $sandbox.stub(FogPlatformReconcileTaskManager, 'findOne').resolves({
      id: 6,
      attempts: 10,
      status: 'failed'
    })

    await FogPlatformReconcileTaskManager.recordFogTaskFailure(
      6,
      'still failing',
      { attempts: 9 },
      transaction
    )

    expect(entity.update).to.have.been.calledWith(
      sinon.match({
        attempts: 10,
        status: 'failed',
        nextAttemptAt: null
      }),
      sinon.match.any
    )
  })
})

describe('Service platform reconcile task enqueue', () => {
  def('sandbox', () => sinon.createSandbox())
  const transaction = {}

  afterEach(() => $sandbox.restore())

  it('stores spec_snapshot JSON at enqueue time', async () => {
    const snapshot = {
      name: 'api',
      type: 'k8s',
      resource: 'default.api',
      targetPort: 8080,
      tags: [{ value: 'hub' }]
    }
    const entity = {
      findOne: $sandbox.stub().resolves(null)
    }
    const created = {
      id: 3,
      serviceName: 'api',
      reason: 'spec-changed',
      specSnapshot: serializeSpecSnapshot(snapshot),
      status: 'pending'
    }

    $sandbox.stub(ServicePlatformReconcileTaskManager, 'getEntity').returns(entity)
    $sandbox.stub(ServicePlatformReconcileTaskManager, 'create').resolves(created)

    const task = await ServicePlatformReconcileTaskManager.enqueueServicePlatformReconcileTask({
      serviceName: 'api',
      reason: 'spec-changed',
      specSnapshot: snapshot
    }, transaction)

    expect(ServicePlatformReconcileTaskManager.create).to.have.been.calledWithMatch({
      serviceName: 'api',
      specSnapshot: serializeSpecSnapshot(snapshot)
    })
    expect(ServicePlatformReconcileTaskManager.getParsedSpecSnapshot(task)).to.eql(snapshot)
  })

  it('coalesces duplicate pending tasks for the same service', async () => {
    const snapshot = { name: 'api', type: 'k8s', resource: 'default.api', targetPort: 8080 }
    const existing = {
      id: 4,
      serviceName: 'api',
      reason: 'spec-changed',
      specSnapshot: serializeSpecSnapshot({ name: 'api', tags: [] }),
      status: 'pending'
    }
    const entity = {
      findOne: $sandbox.stub().resolves(existing),
      update: $sandbox.stub().resolves([1])
    }

    $sandbox.stub(ServicePlatformReconcileTaskManager, 'getEntity').returns(entity)
    $sandbox.stub(ServicePlatformReconcileTaskManager, 'findOne').resolves({
      ...existing,
      specSnapshot: serializeSpecSnapshot(snapshot)
    })
    $sandbox.stub(ServicePlatformReconcileTaskManager, 'create')

    await ServicePlatformReconcileTaskManager.enqueueServicePlatformReconcileTask({
      serviceName: 'api',
      reason: 'spec-changed',
      specSnapshot: snapshot
    }, transaction)

    expect(entity.update).to.have.been.calledOnce
    expect(ServicePlatformReconcileTaskManager.create).to.not.have.been.called
  })
})

describe('Service platform reconcile task claim', () => {
  def('sandbox', () => sinon.createSandbox())
  const transaction = {}

  afterEach(() => $sandbox.restore())

  it('claims an available task atomically', async () => {
    const task = { id: 1, serviceName: 'api', status: 'pending' }
    const entity = {
      findOne: $sandbox.stub().resolves(task),
      update: $sandbox.stub().resolves([1])
    }

    $sandbox.stub(databaseProvider.sequelize, 'transaction').callsFake(async (fn) => fn(transaction))
    $sandbox.stub(ServicePlatformReconcileTaskManager, 'getEntity').returns(entity)
    $sandbox.stub(ServicePlatformReconcileTaskManager, 'findOne').resolves(task)

    const result = await ServicePlatformReconcileTaskManager.claimNextServiceTask('controller-1', 300)

    expect(result).to.eql(task)
    expect(entity.update).to.have.been.calledOnceWith(
      { leaderUuid: 'controller-1', claimedAt: sinon.match.date, status: 'in_progress' },
      sinon.match.has('where', sinon.match.has('id', 1))
    )
  })

  it('returns null when a concurrent claim wins the update', async () => {
    const task = { id: 2, serviceName: 'api-2', status: 'pending' }
    const entity = {
      findOne: $sandbox.stub().resolves(task),
      update: $sandbox.stub().resolves([0])
    }

    $sandbox.stub(databaseProvider.sequelize, 'transaction').callsFake(async (fn) => fn(transaction))
    $sandbox.stub(ServicePlatformReconcileTaskManager, 'getEntity').returns(entity)
    $sandbox.stub(ServicePlatformReconcileTaskManager, 'findOne')

    const result = await ServicePlatformReconcileTaskManager.claimNextServiceTask('controller-1', 300)

    expect(result).to.be.null
    expect(ServicePlatformReconcileTaskManager.findOne).to.not.have.been.called
  })

  it('records retryable failure with backoff', async () => {
    const entity = {
      update: $sandbox.stub().resolves([1])
    }
    const updatedTask = {
      id: 8,
      attempts: 1,
      status: 'pending',
      lastError: 'hub patch failed'
    }

    $sandbox.stub(ServicePlatformReconcileTaskManager, 'getEntity').returns(entity)
    $sandbox.stub(ServicePlatformReconcileTaskManager, 'findOne').resolves(updatedTask)

    const result = await ServicePlatformReconcileTaskManager.recordServiceTaskFailure(
      8,
      'hub patch failed',
      { attempts: 0 },
      transaction
    )

    expect(entity.update).to.have.been.calledOnceWith(
      sinon.match({
        attempts: 1,
        lastError: 'hub patch failed',
        status: 'pending',
        leaderUuid: null,
        claimedAt: null,
        nextAttemptAt: sinon.match.date
      }),
      sinon.match.has('where', { id: 8 })
    )
    expect(result).to.eql(updatedTask)
  })

  it('marks task failed permanently after max attempts', async () => {
    const entity = {
      update: $sandbox.stub().resolves([1])
    }

    $sandbox.stub(ServicePlatformReconcileTaskManager, 'getEntity').returns(entity)
    $sandbox.stub(ServicePlatformReconcileTaskManager, 'findOne').resolves({
      id: 9,
      attempts: 10,
      status: 'failed'
    })

    await ServicePlatformReconcileTaskManager.recordServiceTaskFailure(
      9,
      'still failing',
      { attempts: 9 },
      transaction
    )

    expect(entity.update).to.have.been.calledWith(
      sinon.match({
        attempts: 10,
        status: 'failed',
        nextAttemptAt: null
      }),
      sinon.match.any
    )
  })
})

describe('Hub router ConfigMap lock', () => {
  def('sandbox', () => sinon.createSandbox())
  const transaction = {}

  afterEach(() => $sandbox.restore())

  it('denies acquire when another controller holds a fresh lock', async () => {
    const HubRouterConfigLockManager = require('../../../src/data/managers/hub-router-config-lock-manager')
    const lock = {
      id: 1,
      leaderUuid: 'controller-a',
      claimedAt: new Date()
    }

    $sandbox.stub(HubRouterConfigLockManager, 'initializeLock').resolves()
    $sandbox.stub(HubRouterConfigLockManager, 'findOne').resolves(lock)
    $sandbox.stub(HubRouterConfigLockManager, 'update')

    const acquired = await HubRouterConfigLockManager.tryAcquire('controller-b', 120, transaction)

    expect(acquired).to.equal(false)
    expect(HubRouterConfigLockManager.update).to.not.have.been.called
  })

  it('allows stale lock reclaim by another controller', async () => {
    const HubRouterConfigLockManager = require('../../../src/data/managers/hub-router-config-lock-manager')
    const lock = {
      id: 1,
      leaderUuid: 'controller-a',
      claimedAt: new Date(Date.now() - 200 * 1000)
    }

    $sandbox.stub(HubRouterConfigLockManager, 'initializeLock').resolves()
    $sandbox.stub(HubRouterConfigLockManager, 'findOne').resolves(lock)
    $sandbox.stub(HubRouterConfigLockManager, 'update').resolves()

    const acquired = await HubRouterConfigLockManager.tryAcquire('controller-b', 120, transaction)

    expect(acquired).to.equal(true)
    expect(HubRouterConfigLockManager.update).to.have.been.calledOnceWith(
      { id: 1 },
      { leaderUuid: 'controller-b', claimedAt: sinon.match.date },
      transaction
    )
  })
})
