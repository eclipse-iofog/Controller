const { expect } = require('chai')
const sinon = require('sinon')

const config = require('../../../src/config')
const { RECONCILE_HEAVY_JOBS, startBackgroundJobs } = require('../../../src/helpers/job-startup')

describe('job-startup', () => {
  def('sandbox', () => sinon.createSandbox())

  afterEach(() => {
    $sandbox.restore()
  })

  it('starts lightweight jobs immediately', () => {
    const run = $sandbox.spy()
    startBackgroundJobs([{ module: { run }, file: 'controller-heartbeat-job.js' }])
    expect(run).to.have.been.calledOnce
  })

  it('delays reconcile-heavy jobs by settings.jobStartupDelaySeconds', () => {
    $sandbox.stub(config, 'get').callsFake((key, defaultValue) => {
      if (key === 'settings.jobStartupDelaySeconds') {
        return 2
      }
      return defaultValue
    })
    const clock = $sandbox.useFakeTimers()
    const run = $sandbox.spy()

    startBackgroundJobs([{ module: { run }, file: 'platform-reconcile-worker-job.js' }])

    expect(run).to.not.have.been.called
    clock.tick(2000)
    expect(run).to.have.been.calledOnce
  })

  it('staggers reconcile-heavy jobs by 500ms each', () => {
    $sandbox.stub(config, 'get').callsFake((key, defaultValue) => {
      if (key === 'settings.jobStartupDelaySeconds') {
        return 1
      }
      return defaultValue
    })
    const clock = $sandbox.useFakeTimers()
    const platformRun = $sandbox.spy()
    const natsRun = $sandbox.spy()

    startBackgroundJobs([
      { module: { run: platformRun }, file: 'platform-reconcile-worker-job.js' },
      { module: { run: natsRun }, file: 'nats-reconcile-worker-job.js' }
    ])

    clock.tick(999)
    expect(platformRun).to.not.have.been.called
    expect(natsRun).to.not.have.been.called

    clock.tick(1)
    expect(platformRun).to.have.been.calledOnce
    expect(natsRun).to.not.have.been.called

    clock.tick(500)
    expect(natsRun).to.have.been.calledOnce
  })

  it('lists the expected reconcile-heavy job files', () => {
    expect(RECONCILE_HEAVY_JOBS.has('platform-reconcile-worker-job.js')).to.equal(true)
    expect(RECONCILE_HEAVY_JOBS.has('nats-reconcile-worker-job.js')).to.equal(true)
    expect(RECONCILE_HEAVY_JOBS.has('fog-platform-sweep-job.js')).to.equal(true)
    expect(RECONCILE_HEAVY_JOBS.has('fog-status-job.js')).to.equal(true)
  })
})
