'use strict'

/**
 * Plan 19-I-D — first-fog sqlite integration gate (R133).
 *
 * Skipped in default `npm test` unless RUN_INTEGRATION=1 (full DB migrate + reconcile).
 *
 *   RUN_INTEGRATION=1 npm run test:integration:first-fog
 */

describe('first-fog reconcile sqlite (R133)', function () {
  this.timeout(30000)

  let harness
  let busyRetries = 0
  let restoreBusyCounter

  before(function () {
    if (process.env.RUN_INTEGRATION !== '1') {
      this.skip()
    }
  })

  before(async function () {
    const {
      createFirstFogSqliteHarness,
      installBusyRetryCounter
    } = require('../../support/first-fog-sqlite-harness')

    busyRetries = 0
    restoreBusyCounter = installBusyRetryCounter(() => {
      busyRetries += 1
    })
    harness = await createFirstFogSqliteHarness()
  })

  after(async function () {
    if (restoreBusyCounter) {
      restoreBusyCounter()
    }
    if (harness) {
      await harness.teardown()
    }
  })

  it('reconciles first fog to Ready while concurrent operator API completes under 2s', async function () {
    const { expect } = require('chai')
    const { runInTransaction, PRIORITY_INTERACTIVE } = require('../../../src/helpers/transaction-runner')
    const IofogService = require('../../../src/services/iofog-service')
    const UserService = require('../../../src/services/user-service')
    const FogPlatformStatusManager = require('../../../src/data/managers/fog-platform-status-manager')
    const { drainOnce } = require('../../../src/jobs/reconcile-outbox-drainer-job')
    const PlatformReconcileWorkerJob = require('../../../src/jobs/platform-reconcile-worker-job')
    const { driveReconcileUntilReady } = require('../../support/first-fog-sqlite-harness')

    const fogPayload = {
      name: 'hub-edge',
      host: '127.0.0.1',
      archId: 1,
      containerEngine: 'edgelet',
      bluetoothEnabled: false,
      abstractedHardwareEnabled: false
    }

    let fogUuid
    let concurrentElapsedMs

    const createFogPromise = runInTransaction(
      (transaction) => IofogService.createFogEndPoint(fogPayload, false, transaction),
      { priority: PRIORITY_INTERACTIVE, label: 'integration.createFog' }
    ).then((result) => {
      fogUuid = result.uuid
    })

    const concurrentStart = Date.now()
    const concurrentPromise = Promise.all([
      UserService.login({ email: 'admin', password: harness.bootstrapPassword }, false),
      runInTransaction(
        (transaction) => IofogService.getFogListEndPoint([], false, transaction),
        { priority: PRIORITY_INTERACTIVE, label: 'integration.iofogList' }
      )
    ]).then(() => {
      concurrentElapsedMs = Date.now() - concurrentStart
    })

    await Promise.all([createFogPromise, concurrentPromise])

    expect(concurrentElapsedMs).to.be.lessThan(2000)

    const status = await driveReconcileUntilReady(fogUuid, {
      drainOnce,
      processNextFogTask: PlatformReconcileWorkerJob.processNextFogTask,
      getStatus: (uuid) => FogPlatformStatusManager.getParsedStatus(uuid)
    })

    expect(status.phase).to.equal('Ready')
    expect(status.lastError).to.satisfy((value) => value == null || value === '')
    expect(busyRetries).to.equal(0)
  })
})
