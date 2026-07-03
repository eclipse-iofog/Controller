const { expect } = require('chai')
const sinon = require('sinon')
const WebSocket = require('ws')

const WebSocketServerClass = require('../../../src/websocket/server')
const { createMockWebSocket, resetWebSocketServerSingleton } = require('../../support/ws-session-harness')

describe('WebSocket protocol heartbeat', () => {
  let sandbox
  let wsServer

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    resetWebSocketServerSingleton(WebSocketServerClass)
    wsServer = new WebSocketServerClass()
    wsServer.config.pingInterval = 1000
  })

  afterEach(() => {
    sandbox.restore()
    resetWebSocketServerSingleton(WebSocketServerClass)
  })

  function createHeartbeatSocket () {
    const ws = createMockWebSocket()
    ws.ping = sandbox.spy()
    return ws
  }

  it('sends ws.ping on interval while socket is open', () => {
    const clock = sandbox.useFakeTimers()
    const ws = createHeartbeatSocket()

    wsServer._startWebSocketHeartbeat(ws, { label: 'user-exec', sessionId: 'sess-1' })

    expect(ws.ping.called).to.equal(false)
    clock.tick(1000)
    expect(ws.ping.calledOnce).to.equal(true)
    clock.tick(1000)
    expect(ws.ping.calledTwice).to.equal(true)

    wsServer._stopWebSocketHeartbeat(ws)
    clock.tick(5000)
    expect(ws.ping.calledTwice).to.equal(true)
  })

  it('does not ping after socket closes', () => {
    const clock = sandbox.useFakeTimers()
    const ws = createHeartbeatSocket()

    wsServer._startWebSocketHeartbeat(ws, { label: 'agent-log', sessionId: 'sess-2' })
    clock.tick(1000)
    expect(ws.ping.calledOnce).to.equal(true)

    ws.readyState = WebSocket.CLOSED
    clock.tick(3000)
    expect(ws.ping.calledOnce).to.equal(true)
  })

  it('stops heartbeat and clears timer on close event', () => {
    const clock = sandbox.useFakeTimers()
    const ws = createHeartbeatSocket()

    wsServer._startWebSocketHeartbeat(ws, { label: 'user-log', sessionId: 'sess-3' })
    clock.tick(1000)
    expect(ws.ping.calledOnce).to.equal(true)

    ws.emit('close', 1000, 'normal')
    expect(ws._heartbeatTimer).to.equal(null)

    clock.tick(5000)
    expect(ws.ping.calledOnce).to.equal(true)
  })

  it('replaces existing timer when heartbeat is restarted', () => {
    const clock = sandbox.useFakeTimers()
    const ws = createHeartbeatSocket()

    wsServer._startWebSocketHeartbeat(ws, { label: 'agent-exec', sessionId: 'sess-4' })
    const firstTimer = ws._heartbeatTimer
    wsServer._startWebSocketHeartbeat(ws, { label: 'agent-exec', sessionId: 'sess-4' })

    expect(ws._heartbeatTimer).to.not.equal(firstTimer)
    clock.tick(1000)
    expect(ws.ping.calledOnce).to.equal(true)
  })

  it('skips heartbeat when pingInterval is disabled', () => {
    const clock = sandbox.useFakeTimers()
    const ws = createHeartbeatSocket()
    wsServer.config.pingInterval = 0

    wsServer._startWebSocketHeartbeat(ws, { label: 'user-exec', sessionId: 'sess-5' })

    expect(ws._heartbeatTimer).to.equal(undefined)
    clock.tick(5000)
    expect(ws.ping.called).to.equal(false)
  })

  it('stops heartbeat for both peers during exec session cleanup', async () => {
    const user = createHeartbeatSocket()
    const agent = createHeartbeatSocket()
    const sessionId = 'exec-cleanup'
    const transaction = { fakeTransaction: true }

    wsServer.execSessionManager.createExecSession(sessionId, 'ms-uuid', agent, user, transaction)
    wsServer._startWebSocketHeartbeat(user, { label: 'user-exec', sessionId })
    wsServer._startWebSocketHeartbeat(agent, { label: 'agent-exec', sessionId })

    sandbox.stub(wsServer.execSessionManager, 'removeExecSession').resolves()
    sandbox.stub(wsServer.relayTransport, 'cleanup').resolves()
    sandbox.stub(wsServer, '_notifyExecRemotePeerClose').resolves()

    await wsServer.cleanupExecSession(sessionId, transaction)

    expect(user._heartbeatTimer).to.equal(null)
    expect(agent._heartbeatTimer).to.equal(null)
  })

  it('stops heartbeat for both peers during log session cleanup', async () => {
    const user = createHeartbeatSocket()
    const agent = createHeartbeatSocket()
    const sessionId = 'log-cleanup'
    const transaction = { fakeTransaction: true }

    wsServer.logSessionManager.createLogSession(
      sessionId,
      'ms-uuid',
      null,
      agent,
      user,
      { tail: 100, follow: true },
      transaction
    )
    wsServer._startWebSocketHeartbeat(user, { label: 'user-log', sessionId })
    wsServer._startWebSocketHeartbeat(agent, { label: 'agent-log', sessionId })

    sandbox.stub(wsServer.logSessionManager, 'removeLogSession').resolves()
    sandbox.stub(wsServer.relayTransport, 'cleanupLogSession').resolves()

    await wsServer.cleanupLogSession(sessionId, transaction)

    expect(user._heartbeatTimer).to.equal(null)
    expect(agent._heartbeatTimer).to.equal(null)
  })
})
