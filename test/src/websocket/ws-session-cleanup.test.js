const { expect } = require('chai')
const sinon = require('sinon')

const WebSocketServerClass = require('../../../src/websocket/server')
const transactionRunner = require('../../../src/helpers/transaction-runner')
const { PRIORITY_BACKGROUND } = transactionRunner
const { resetWebSocketServerSingleton } = require('../../support/ws-session-harness')

describe('WebSocket session cleanup dedupe', () => {
  def('sandbox', () => sinon.createSandbox())

  let wsServer

  beforeEach(() => {
    resetWebSocketServerSingleton(WebSocketServerClass)
    wsServer = new WebSocketServerClass()
  })

  afterEach(() => {
    $sandbox.restore()
    resetWebSocketServerSingleton(WebSocketServerClass)
  })

  it('dedupes concurrent exec cleanups for the same sessionId', async () => {
    let resolveCleanup
    const gate = new Promise((resolve) => {
      resolveCleanup = resolve
    })

    $sandbox.stub(transactionRunner, 'runInTransaction').callsFake(async (fn, options) => {
      expect(options).to.include({ priority: PRIORITY_BACKGROUND, label: 'ws.exec.cleanup' })
      await gate
      return fn({ id: 'tx-exec' })
    })
    $sandbox.stub(wsServer, 'cleanupExecSession').resolves()

    const first = wsServer._cleanupExecSessionInTransaction('session-1')
    const second = wsServer._cleanupExecSessionInTransaction('session-1')

    expect(transactionRunner.runInTransaction).to.have.been.calledOnce

    resolveCleanup()
    await Promise.all([first, second])

    expect(wsServer.cleanupExecSession).to.have.been.calledOnceWith('session-1', { id: 'tx-exec' })
    expect(wsServer._execCleanupInflight.has('session-1')).to.equal(false)
  })

  it('dedupes concurrent log cleanups for the same sessionId', async () => {
    let resolveCleanup
    const gate = new Promise((resolve) => {
      resolveCleanup = resolve
    })

    $sandbox.stub(transactionRunner, 'runInTransaction').callsFake(async (fn, options) => {
      expect(options).to.include({ priority: PRIORITY_BACKGROUND, label: 'ws.log.cleanup' })
      await gate
      return fn({ id: 'tx-log' })
    })
    $sandbox.stub(wsServer, 'cleanupLogSession').resolves()

    const first = wsServer._cleanupLogSessionInTransaction('log-session-1')
    const second = wsServer._cleanupLogSessionInTransaction('log-session-1')

    expect(transactionRunner.runInTransaction).to.have.been.calledOnce

    resolveCleanup()
    await Promise.all([first, second])

    expect(wsServer.cleanupLogSession).to.have.been.calledOnceWith('log-session-1', { id: 'tx-log' })
    expect(wsServer._logCleanupInflight.has('log-session-1')).to.equal(false)
  })
})
