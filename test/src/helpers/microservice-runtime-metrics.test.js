const { expect } = require('chai')

const {
  isLiveRuntimeStatus,
  zeroRuntimeMetrics,
  coerceRuntimeMetric,
  applyRuntimeMetrics,
  applyCrashExtras,
  projectStatusForApi
} = require('../../../src/helpers/microservice-runtime-metrics')

describe('helpers/microservice-runtime-metrics', () => {
  describe('isLiveRuntimeStatus()', () => {
    it('is true only for RUNNING', () => {
      expect(isLiveRuntimeStatus('RUNNING')).to.equal(true)
      expect(isLiveRuntimeStatus('STOPPING')).to.equal(false)
      expect(isLiveRuntimeStatus('STOPPED')).to.equal(false)
      expect(isLiveRuntimeStatus('UNKNOWN')).to.equal(false)
    })
  })

  describe('zeroRuntimeMetrics()', () => {
    it('returns zero cpu, memory, startTime, and operatingDuration', () => {
      expect(zeroRuntimeMetrics()).to.eql({
        cpuUsage: 0,
        memoryUsage: 0,
        startTime: 0,
        operatingDuration: 0
      })
    })
  })

  describe('coerceRuntimeMetric()', () => {
    it('treats omitted values as 0', () => {
      expect(coerceRuntimeMetric(undefined)).to.equal(0)
      expect(coerceRuntimeMetric(null)).to.equal(0)
      expect(coerceRuntimeMetric('')).to.equal(0)
    })

    it('parses numeric strings', () => {
      expect(coerceRuntimeMetric('12.5')).to.equal(12.5)
      expect(coerceRuntimeMetric('8')).to.equal(8)
    })

    it('treats non-numeric values as 0', () => {
      expect(coerceRuntimeMetric('n/a')).to.equal(0)
    })
  })

  describe('applyRuntimeMetrics()', () => {
    it('leaves live RUNNING meters unchanged', () => {
      const patch = { status: 'RUNNING', cpuUsage: 12.5, memoryUsage: 64, startTime: 9, operatingDuration: 10 }
      expect(applyRuntimeMetrics(patch, 'RUNNING')).to.equal(patch)
      expect(patch).to.include({ cpuUsage: 12.5, memoryUsage: 64, startTime: 9, operatingDuration: 10 })
    })

    it('zeros meters for any non-RUNNING status', () => {
      const patch = {
        status: 'STOPPED',
        cpuUsage: 12.5,
        memoryUsage: 64,
        startTime: 9,
        operatingDuration: 10,
        containerId: 'ctr-1',
        errorMessage: 'exit 1',
        podId: 'pod-1',
        healthStatus: 'healthy'
      }
      applyRuntimeMetrics(patch, 'STOPPED')
      expect(patch).to.include({
        cpuUsage: 0,
        memoryUsage: 0,
        startTime: 0,
        operatingDuration: 0,
        containerId: 'ctr-1',
        errorMessage: 'exit 1',
        podId: 'pod-1',
        healthStatus: 'healthy'
      })
    })
  })

  describe('projectStatusForApi()', () => {
    it('zeros meters on a non-RUNNING row without dropping identity fields', () => {
      const projected = projectStatusForApi({
        status: 'FAILED',
        cpuUsage: 22,
        memoryUsage: 100,
        startTime: 1,
        operatingDuration: 2,
        containerId: 'ctr-keep',
        errorMessage: 'boom',
        podId: 'pod-keep',
        healthStatus: 'unhealthy'
      })
      expect(projected).to.include({
        status: 'FAILED',
        cpuUsage: 0,
        memoryUsage: 0,
        startTime: 0,
        operatingDuration: 0,
        containerId: 'ctr-keep',
        errorMessage: 'boom',
        podId: 'pod-keep',
        healthStatus: 'unhealthy'
      })
    })

    it('does not mutate the original row', () => {
      const row = { status: 'STOPPED', cpuUsage: 9, containerId: 'ctr-1' }
      const projected = projectStatusForApi(row)
      expect(projected.cpuUsage).to.equal(0)
      expect(row.cpuUsage).to.equal(9)
    })

    it('clones Sequelize-style rows via get({ plain: true })', () => {
      const row = {
        get (options) {
          expect(options).to.eql({ plain: true })
          return { status: 'STOPPING', cpuUsage: 4, memoryUsage: 8, containerId: 'ctr-2' }
        }
      }
      expect(projectStatusForApi(row)).to.include({
        status: 'STOPPING',
        cpuUsage: 0,
        memoryUsage: 0,
        containerId: 'ctr-2'
      })
    })

    it('always returns lastError, lastErrorAt, and restartCount', () => {
      const projected = projectStatusForApi({
        status: 'RUNNING',
        cpuUsage: 1,
        lastError: 'exitCode=1 oomKilled=false',
        lastErrorAt: 1726660000123,
        restartCount: 4
      })
      expect(projected).to.include({
        lastError: 'exitCode=1 oomKilled=false',
        lastErrorAt: 1726660000123,
        restartCount: 4
      })
    })

    it('fills empty last crash fields when the row omits them', () => {
      expect(projectStatusForApi({ status: 'RUNNING', cpuUsage: 1 })).to.include({
        lastError: '',
        lastErrorAt: 0,
        restartCount: 0
      })
    })
  })

  describe('applyCrashExtras()', () => {
    it('persists lastError, lastErrorAt, and restartCount when present', () => {
      const patch = { status: 'RUNNING' }
      applyCrashExtras(patch, {
        lastError: 'exitCode=1 oomKilled=false error=config missing',
        lastErrorAt: 1726660000123,
        restartCount: 4
      })
      expect(patch).to.include({
        lastError: 'exitCode=1 oomKilled=false error=config missing',
        lastErrorAt: 1726660000123,
        restartCount: 4
      })
    })

    it('writes restartCount 0 when lastError is present and restartCount is omitted', () => {
      const patch = { status: 'STARTING' }
      applyCrashExtras(patch, {
        lastError: 'exitCode=1 oomKilled=false',
        lastErrorAt: 1726660000123
      })
      expect(patch.lastError).to.equal('exitCode=1 oomKilled=false')
      expect(patch.lastErrorAt).to.equal(1726660000123)
      expect(patch.restartCount).to.equal(0)
    })

    it('leaves last crash fields unset when all extras are omitted', () => {
      const patch = { status: 'RUNNING', cpuUsage: 1 }
      applyCrashExtras(patch, { status: 'RUNNING' })
      expect(patch).to.not.have.property('lastError')
      expect(patch).to.not.have.property('lastErrorAt')
      expect(patch).to.not.have.property('restartCount')
    })

    it('does not treat empty lastError as a wipe', () => {
      const patch = { status: 'RUNNING' }
      applyCrashExtras(patch, { lastError: '', lastErrorAt: 0 })
      expect(patch).to.not.have.property('lastError')
      expect(patch).to.not.have.property('lastErrorAt')
      expect(patch).to.not.have.property('restartCount')
    })

    it('ignores malformed extras instead of throwing', () => {
      const patch = { status: 'RUNNING' }
      applyCrashExtras(patch, { lastError: { nested: true }, lastErrorAt: 'nope', restartCount: 'n/a' })
      expect(patch).to.not.have.property('lastError')
      expect(patch).to.not.have.property('lastErrorAt')
      expect(patch).to.not.have.property('restartCount')
    })
  })
})
