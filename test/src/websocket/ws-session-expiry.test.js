const { expect } = require('chai')
const sinon = require('sinon')

const ExecSessionManager = require('../../../src/websocket/exec-session-manager')
const LogSessionManager = require('../../../src/websocket/log-session-manager')
const MicroserviceExecSessionManager = require('../../../src/data/managers/microservice-exec-session-manager')
const MicroserviceLogStatusManager = require('../../../src/data/managers/microservice-log-status-manager')
const MicroserviceManager = require('../../../src/data/managers/microservice-manager')
const FogManager = require('../../../src/data/managers/iofog-manager')
const ChangeTrackingService = require('../../../src/services/change-tracking-service')

describe('WebSocket session expiry — remoteAgentPaired / remoteUserPaired', () => {
  def('sandbox', () => sinon.createSandbox())

  beforeEach(() => {
    $sandbox.stub(MicroserviceExecSessionManager, 'deleteBySessionId').resolves()
    $sandbox.stub(MicroserviceManager, 'findOne').resolves({ iofogUuid: 'fog-1' })
    $sandbox.stub(FogManager, 'findOne').resolves({ uuid: 'fog-1' })
    $sandbox.stub(ChangeTrackingService, 'update').resolves()
    $sandbox.stub(MicroserviceLogStatusManager, 'delete').resolves()
  })

  afterEach(() => {
    $sandbox.restore()
  })

  it('does not expire cross-replica paired exec user before maxDuration', async () => {
    const manager = new ExecSessionManager({
      session: {
        execPendingTimeoutMs: 60000,
        execMaxDurationMs: 28800000,
        cleanupInterval: 30000
      }
    })
    manager.stopCleanupInterval()

    const now = Date.now()
    manager.execSessions.set('exec-1', {
      sessionId: 'exec-1',
      microserviceUuid: 'ms-1',
      user: { readyState: 1, close: () => {} },
      agent: null,
      remoteAgentPaired: true,
      createdAt: now - 120000,
      lastActivity: now - 1000
    })

    const expired = await manager.cleanupExpiredSessions({})
    expect(expired).to.equal(0)
    expect(manager.execSessions.has('exec-1')).to.equal(true)
    expect(MicroserviceExecSessionManager.deleteBySessionId).to.not.have.been.called
  })

  it('expires cross-replica paired exec user after maxDuration idle', async () => {
    const manager = new ExecSessionManager({
      session: {
        execPendingTimeoutMs: 60000,
        execMaxDurationMs: 1000,
        cleanupInterval: 30000
      }
    })
    manager.stopCleanupInterval()

    const now = Date.now()
    manager.execSessions.set('exec-1', {
      sessionId: 'exec-1',
      microserviceUuid: 'ms-1',
      user: { readyState: 1, close: $sandbox.spy() },
      agent: null,
      remoteAgentPaired: true,
      createdAt: now - 5000,
      lastActivity: now - 2000
    })

    const expired = await manager.cleanupExpiredSessions({})
    expect(expired).to.equal(1)
    expect(manager.execSessions.has('exec-1')).to.equal(false)
  })

  it('does not expire cross-replica paired log user before idleTimeout', async () => {
    const manager = new LogSessionManager({
      session: {
        logPendingTimeoutMs: 120000,
        logIdleTimeoutMs: 7200000,
        cleanupInterval: 30000
      }
    })
    manager.stopCleanupInterval()

    const now = Date.now()
    manager.logSessions.set('log-1', {
      sessionId: 'log-1',
      microserviceUuid: 'ms-1',
      fogUuid: null,
      user: { readyState: 1, close: () => {} },
      agent: null,
      remoteAgentPaired: true,
      createdAt: now - 180000,
      lastActivity: now - 1000
    })

    const expired = await manager.cleanupExpiredSessions({})
    expect(expired).to.equal(0)
    expect(manager.logSessions.has('log-1')).to.equal(true)
  })

  it('does not expire cross-replica paired exec agent before maxDuration', async () => {
    const manager = new ExecSessionManager({
      session: {
        execPendingTimeoutMs: 60000,
        execMaxDurationMs: 28800000,
        cleanupInterval: 30000
      }
    })
    manager.stopCleanupInterval()

    const now = Date.now()
    manager.execSessions.set('exec-1', {
      sessionId: 'exec-1',
      microserviceUuid: 'ms-1',
      user: null,
      agent: { readyState: 1, close: () => {} },
      remoteUserPaired: true,
      createdAt: now - 120000,
      lastActivity: now - 1000
    })

    const expired = await manager.cleanupExpiredSessions({})
    expect(expired).to.equal(0)
    expect(manager.execSessions.has('exec-1')).to.equal(true)
    expect(MicroserviceExecSessionManager.deleteBySessionId).to.not.have.been.called
  })

  it('does not expire cross-replica paired log agent before idleTimeout', async () => {
    const manager = new LogSessionManager({
      session: {
        logPendingTimeoutMs: 120000,
        logIdleTimeoutMs: 7200000,
        cleanupInterval: 30000
      }
    })
    manager.stopCleanupInterval()

    const now = Date.now()
    manager.logSessions.set('log-1', {
      sessionId: 'log-1',
      microserviceUuid: 'ms-1',
      fogUuid: null,
      user: null,
      agent: { readyState: 1, close: () => {} },
      remoteUserPaired: true,
      createdAt: now - 180000,
      lastActivity: now - 1000
    })

    const expired = await manager.cleanupExpiredSessions({})
    expect(expired).to.equal(0)
    expect(manager.logSessions.has('log-1')).to.equal(true)
  })
})
