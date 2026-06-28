const { expect } = require('chai')
const sinon = require('sinon')
const msgpack = require('@msgpack/msgpack')

const WebSocketQueueService = require('../../../src/services/websocket-queue-service')
const RouterConnectionManager = require('../../../src/services/router-connection-manager')

describe('WebSocketQueueService — AMQP hardening', () => {
  def('sandbox', () => sinon.createSandbox())

  const sessionId = 'log-session-backpressure'
  const execId = 'exec-session-overflow'

  afterEach(() => {
    $sandbox.restore()
    WebSocketQueueService.execBridges.clear()
    WebSocketQueueService.logBridges.clear()
  })

  describe('publishLogToUser() publish-side backpressure', () => {
    it('drops LOG_LINE when sender is not sendable', async () => {
      const userWs = {
        readyState: 1,
        send: sinon.stub()
      }
      const sender = {
        sendable: () => false,
        send: sinon.stub()
      }

      WebSocketQueueService.logBridges.set(sessionId, {
        sessionId,
        slotId: 0,
        session: { sessionId, user: userWs },
        userSender: { sender },
        backpressureNotified: false
      })

      const buffer = msgpack.encode({
        type: 6,
        data: Buffer.from('line\n'),
        sessionId
      })

      await WebSocketQueueService.publishLogToUser(sessionId, buffer)

      expect(sender.send).to.not.have.been.called
      expect(userWs.send).to.have.been.calledOnce
    })
  })

  describe('overflow recovery', () => {
    it('recovers publish after slot reconnect without poisoning other sessions', async () => {
      const bridge = {
        execId,
        slotId: RouterConnectionManager.slotIdForSession(execId),
        session: { execId },
        senders: {},
        receivers: {},
        linkRefs: {}
      }
      WebSocketQueueService.execBridges.set(execId, bridge)

      const sender = {
        sendable: () => true,
        send: sinon.stub()
      }
      let ensureCount = 0
      $sandbox.stub(WebSocketQueueService, '_ensureSender').callsFake(async () => {
        ensureCount += 1
        if (ensureCount === 1) {
          throw new Error('circular buffer overflow')
        }
        return { sender }
      })

      const markStub = $sandbox.stub(RouterConnectionManager, 'markSlotUnhealthy').resolves()
      $sandbox.stub(RouterConnectionManager, 'waitForSendable').resolves()

      await expect(WebSocketQueueService.publishToAgent(execId, Buffer.from('fail')))
        .to.be.rejectedWith(/circular buffer overflow/)

      expect(markStub).to.have.been.calledOnce

      await WebSocketQueueService.publishToAgent(execId, Buffer.from('ok'))

      expect(sender.send).to.have.been.calledOnceWith(sinon.match({ body: Buffer.from('ok') }))
    })

    it('does not poison unrelated exec sessions when one slot overflows', async () => {
      const otherExecId = 'exec-session-healthy'
      const healthyBridge = {
        execId: otherExecId,
        slotId: RouterConnectionManager.slotIdForSession(otherExecId),
        session: { execId: otherExecId },
        senders: {},
        receivers: {},
        linkRefs: {}
      }
      WebSocketQueueService.execBridges.set(otherExecId, healthyBridge)

      const overflowBridge = {
        execId,
        slotId: RouterConnectionManager.slotIdForSession(execId),
        session: { execId },
        senders: {},
        receivers: {},
        linkRefs: {}
      }
      WebSocketQueueService.execBridges.set(execId, overflowBridge)

      const healthySender = {
        sendable: () => true,
        send: sinon.stub()
      }
      const overflowSender = {
        sendable: () => true,
        send: sinon.stub().throws(new Error('circular buffer overflow'))
      }

      $sandbox.stub(WebSocketQueueService, '_ensureSender').callsFake(async (id) => {
        if (id === execId) {
          return { sender: overflowSender }
        }
        return { sender: healthySender }
      })

      $sandbox.stub(RouterConnectionManager, 'markSlotUnhealthy').resolves()
      $sandbox.stub(RouterConnectionManager, 'waitForSendable').resolves()

      await expect(WebSocketQueueService.publishToAgent(execId, Buffer.from('fail')))
        .to.be.rejectedWith(/circular buffer overflow/)

      await WebSocketQueueService.publishToAgent(otherExecId, Buffer.from('ok'))

      expect(healthySender.send).to.have.been.calledOnceWith(sinon.match({ body: Buffer.from('ok') }))
      expect(overflowSender.send).to.have.been.calledOnce
    })
  })
})
