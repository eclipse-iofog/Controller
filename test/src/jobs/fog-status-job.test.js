const { expect } = require('chai')
const fs = require('fs')
const path = require('path')
const sinon = require('sinon')

const FogManager = require('../../../src/data/managers/iofog-manager')
const ApplicationManager = require('../../../src/data/managers/application-manager')
const MicroserviceManager = require('../../../src/data/managers/microservice-manager')
const MicroserviceStatusManager = require('../../../src/data/managers/microservice-status-manager')
const MicroserviceExecStatusManager = require('../../../src/data/managers/microservice-exec-status-manager')
const FogStatusJob = require('../../../src/jobs/fog-status-job')
const FogStates = require('../../../src/enums/fog-state')

const JOB_SOURCE = fs.readFileSync(path.join(__dirname, '../../../src/jobs/fog-status-job.js'), 'utf8')

describe('fog-status-job', () => {
  def('sandbox', () => sinon.createSandbox())
  const transaction = {}

  afterEach(() => $sandbox.restore())

  describe('clampedStatusFrequencySec()', () => {
    it('uses a 10s floor when frequency is 0', () => {
      expect(FogStatusJob.clampedStatusFrequencySec(0)).to.equal(10)
    })

    it('keeps a frequency above the floor', () => {
      expect(FogStatusJob.clampedStatusFrequencySec(30)).to.equal(30)
    })
  })

  describe('isFogStatusStale()', () => {
    it('does not treat frequency 0 as an immediate miss', () => {
      const nowMs = 1_000_000
      const fog = { lastStatusTime: nowMs - 15_000, statusFrequency: 0 }
      expect(FogStatusJob.isFogStatusStale(fog, 3, nowMs)).to.equal(false)
    })

    it('marks a fog stale after the clamped deadline', () => {
      const nowMs = 1_000_000
      const fog = { lastStatusTime: nowMs - 31_000, statusFrequency: 0 }
      expect(FogStatusJob.isFogStatusStale(fog, 3, nowMs)).to.equal(true)
    })

    it('keeps a just-heard fog live even when an agent clock of 0 would miss the deadline', () => {
      const nowMs = 1_700_000_000_000
      expect(FogStatusJob.isFogStatusStale({ lastStatusTime: nowMs, statusFrequency: 10 }, 3, nowMs)).to.equal(false)
      expect(FogStatusJob.isFogStatusStale({ lastStatusTime: 0, statusFrequency: 10 }, 3, nowMs)).to.equal(true)
    })
  })

  describe('shouldMarkUnknownOnQuietFog()', () => {
    it('skips desired-inactive STOPPED microservices', () => {
      expect(FogStatusJob.shouldMarkUnknownOnQuietFog({
        isActivated: false,
        microserviceStatus: { id: 1, status: 'STOPPED' }
      }, { isActivated: true })).to.equal(false)
    })

    it('skips microservices on a deactivated application', () => {
      expect(FogStatusJob.shouldMarkUnknownOnQuietFog({
        isActivated: true,
        microserviceStatus: { id: 1, status: 'RUNNING' }
      }, { isActivated: false })).to.equal(false)
    })

    it('marks desired-active workloads unknown', () => {
      expect(FogStatusJob.shouldMarkUnknownOnQuietFog({
        isActivated: true,
        microserviceStatus: { id: 1, status: 'RUNNING' }
      }, { isActivated: true })).to.equal(true)
    })
  })

  describe('processLivenessChunk()', () => {
    beforeEach(() => {
      $sandbox.stub(FogManager, 'findStatusLivenessCandidates')
      $sandbox.stub(FogManager, 'update')
      $sandbox.stub(MicroserviceManager, 'findAllWithStatuses')
      $sandbox.stub(ApplicationManager, 'findAll')
      $sandbox.stub(MicroserviceStatusManager, 'update')
      $sandbox.stub(MicroserviceExecStatusManager, 'update')
    })

    it('does not update when no quiet fogs are found', async () => {
      FogManager.findStatusLivenessCandidates.resolves([])

      const result = await FogStatusJob.processLivenessChunk(null, 50, 3, transaction)

      expect(result).to.eql({ nextCursor: null, staleCount: 0 })
      expect(FogManager.update).to.not.have.been.called
      expect(MicroserviceManager.findAllWithStatuses).to.not.have.been.called
    })

    it('does not update when candidates are still within their deadline', async () => {
      const nowMs = Date.now()
      FogManager.findStatusLivenessCandidates.resolves([{
        uuid: 'fog-fresh',
        statusFrequency: 0,
        lastStatusTime: nowMs - 1_000,
        daemonStatus: FogStates.RUNNING
      }])

      const result = await FogStatusJob.processLivenessChunk(null, 50, 3, transaction)

      expect(result.nextCursor).to.equal('fog-fresh')
      expect(result.staleCount).to.equal(0)
      expect(FogManager.update).to.not.have.been.called
      expect(MicroserviceManager.findAllWithStatuses).to.not.have.been.called
    })

    it('marks a quiet desired-active microservice UNKNOWN with zero meters', async () => {
      const nowMs = Date.now()
      FogManager.findStatusLivenessCandidates.resolves([{
        uuid: 'fog-quiet',
        statusFrequency: 10,
        lastStatusTime: nowMs - 60_000,
        daemonStatus: FogStates.RUNNING
      }])
      MicroserviceManager.findAllWithStatuses.resolves([{
        applicationId: 7,
        isActivated: true,
        microserviceStatus: { id: 11, status: 'RUNNING' },
        microserviceExecStatus: { id: 21 }
      }])
      ApplicationManager.findAll.resolves([{ id: 7, isActivated: true }])
      FogManager.update.resolves()
      MicroserviceStatusManager.update.resolves()
      MicroserviceExecStatusManager.update.resolves()

      const result = await FogStatusJob.processLivenessChunk(null, 50, 3, transaction)

      expect(result.staleCount).to.equal(1)
      expect(FogManager.update).to.have.been.calledWith(
        { uuid: ['fog-quiet'] },
        { daemonStatus: FogStates.UNKNOWN },
        transaction
      )
      expect(MicroserviceStatusManager.update).to.have.been.calledWith(
        { id: [11] },
        sinon.match({
          status: 'UNKNOWN',
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

    it('does not mark desired-inactive STOPPED microservices UNKNOWN', async () => {
      const nowMs = Date.now()
      FogManager.findStatusLivenessCandidates.resolves([{
        uuid: 'fog-quiet',
        statusFrequency: 10,
        lastStatusTime: nowMs - 60_000,
        daemonStatus: FogStates.WARNING
      }])
      MicroserviceManager.findAllWithStatuses.resolves([{
        applicationId: 7,
        isActivated: false,
        microserviceStatus: { id: 11, status: 'STOPPED' },
        microserviceExecStatus: { id: 21 }
      }])
      ApplicationManager.findAll.resolves([{ id: 7, isActivated: true }])
      FogManager.update.resolves()

      await FogStatusJob.processLivenessChunk(null, 50, 3, transaction)

      expect(FogManager.update).to.have.been.calledOnce
      expect(MicroserviceStatusManager.update).to.not.have.been.called
      expect(MicroserviceExecStatusManager.update).to.not.have.been.called
    })
  })

  describe('run()', () => {
    it('runs inner work once when a second pass overlaps', async () => {
      $sandbox.useFakeTimers()
      let release
      const blocked = new Promise((resolve) => { release = resolve })
      $sandbox.stub(FogStatusJob, 'runLivenessPass').callsFake(() => blocked)

      const first = FogStatusJob.run()
      await Promise.resolve()
      await FogStatusJob.run()
      expect(FogStatusJob.runLivenessPass).to.have.been.calledOnce

      release()
      await first
    })
  })

  it('does not delete microservices from the liveness job', () => {
    expect(JOB_SOURCE).to.not.include('deleteMicroserviceWithRoutesAndPortMappings')
    expect(JOB_SOURCE).to.not.include('deleteNotRunningMicroservices')
  })
})
