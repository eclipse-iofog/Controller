const { expect } = require('chai')
const sinon = require('sinon')

const ApplicationManager = require('../../../src/data/managers/application-manager')
const MicroserviceManager = require('../../../src/data/managers/microservice-manager')
const MicroserviceStatusManager = require('../../../src/data/managers/microservice-status-manager')
const MicroserviceExecStatusManager = require('../../../src/data/managers/microservice-exec-status-manager')
const StoppedAppStatusJob = require('../../../src/jobs/stopped-app-status-job')

describe('stopped-app-status-job', () => {
  def('sandbox', () => sinon.createSandbox())
  const transaction = {}

  afterEach(() => $sandbox.restore())

  describe('shouldForceObservedStopped()', () => {
    it('matches leftover observed statuses on desired-inactive workloads', () => {
      expect(StoppedAppStatusJob.shouldForceObservedStopped({
        microserviceStatus: { status: 'RUNNING' }
      })).to.equal(true)
      expect(StoppedAppStatusJob.shouldForceObservedStopped({
        microserviceStatus: { status: 'STOPPING' }
      })).to.equal(true)
      expect(StoppedAppStatusJob.shouldForceObservedStopped({
        microserviceStatus: { status: 'DELETED' }
      })).to.equal(true)
      expect(StoppedAppStatusJob.shouldForceObservedStopped({
        microserviceStatus: { status: 'DELETING' }
      })).to.equal(true)
    })

    it('leaves already STOPPED rows alone', () => {
      expect(StoppedAppStatusJob.shouldForceObservedStopped({
        microserviceStatus: { status: 'STOPPED' }
      })).to.equal(false)
    })
  })

  describe('updateMicroserviceStatusStopped()', () => {
    beforeEach(() => {
      $sandbox.stub(MicroserviceStatusManager, 'update').resolves()
      $sandbox.stub(MicroserviceExecStatusManager, 'update').resolves()
    })

    it('does not update when there are no leftover statuses', async () => {
      await StoppedAppStatusJob.updateMicroserviceStatusStopped([{
        microserviceStatus: { id: 1, status: 'STOPPED' },
        microserviceExecStatus: { id: 2 }
      }], transaction)

      expect(MicroserviceStatusManager.update).to.not.have.been.called
      expect(MicroserviceExecStatusManager.update).to.not.have.been.called
    })

    it('sets desired-inactive RUNNING to STOPPED with zero meters', async () => {
      await StoppedAppStatusJob.updateMicroserviceStatusStopped([{
        isActivated: false,
        microserviceStatus: { id: 11, status: 'RUNNING' },
        microserviceExecStatus: { id: 21 }
      }], transaction)

      expect(MicroserviceStatusManager.update).to.have.been.calledWith(
        { id: [11] },
        sinon.match({
          status: 'STOPPED',
          cpuUsage: 0,
          memoryUsage: 0,
          startTime: 0,
          operatingDuration: 0
        }),
        transaction
      )
      expect(MicroserviceExecStatusManager.update).to.have.been.calledWith(
        { id: [21] },
        { execSessionId: '', status: 'INACTIVE' },
        transaction
      )
    })
  })

  describe('updateDeactivatedMicroservices()', () => {
    it('skips status updates when no individually deactivated microservices exist', async () => {
      $sandbox.stub(ApplicationManager, 'findAllWithAttributes').resolves([{ id: 3 }])
      $sandbox.stub(MicroserviceManager, 'findAllWithStatuses').resolves([])
      $sandbox.stub(MicroserviceStatusManager, 'update')

      await StoppedAppStatusJob.updateDeactivatedMicroservices(transaction)

      expect(MicroserviceStatusManager.update).to.not.have.been.called
    })
  })

  describe('updateApplicationMicroservices()', () => {
    it('skips status updates when no deactivated applications exist', async () => {
      $sandbox.stub(ApplicationManager, 'findAllWithAttributes').resolves([])
      $sandbox.stub(MicroserviceManager, 'findAllWithStatuses')
      $sandbox.stub(MicroserviceStatusManager, 'update')

      await StoppedAppStatusJob.updateApplicationMicroservices(transaction)

      expect(MicroserviceManager.findAllWithStatuses).to.not.have.been.called
      expect(MicroserviceStatusManager.update).to.not.have.been.called
    })
  })

  describe('run()', () => {
    it('runs inner work once when a second pass overlaps', async () => {
      $sandbox.useFakeTimers()
      let release
      const blocked = new Promise((resolve) => { release = resolve })
      $sandbox.stub(StoppedAppStatusJob, 'runSafetyNetPass').callsFake(() => blocked)

      const first = StoppedAppStatusJob.run()
      await Promise.resolve()
      await StoppedAppStatusJob.run()
      expect(StoppedAppStatusJob.runSafetyNetPass).to.have.been.calledOnce

      release()
      await first
    })
  })
})
