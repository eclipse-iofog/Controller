const { expect } = require('chai')
const sinon = require('sinon')
const msgpack = require('@msgpack/msgpack')
const WebSocket = require('ws')

const {
  NatsRelayTransportImpl,
  execAgentSubject,
  execUserSubject,
  logUserSubject
} = require('../../../src/services/nats-relay-transport-impl')

function createMockNatsConnection () {
  const subscriptions = new Map()

  return {
    subscriptions,
    publish (subject, data, opts = {}) {
      const handlers = subscriptions.get(subject) || []
      for (const handler of handlers) {
        handler(null, {
          subject,
          data,
          headers: opts.headers
        })
      }
    },
    subscribe (subject, opts = {}) {
      if (!subscriptions.has(subject)) {
        subscriptions.set(subject, [])
      }
      subscriptions.get(subject).push(opts.callback)
      return {
        unsubscribe () {
          const list = subscriptions.get(subject) || []
          subscriptions.set(subject, list.filter((fn) => fn !== opts.callback))
        },
        drain: async () => {
          const list = subscriptions.get(subject) || []
          subscriptions.set(subject, list.filter((fn) => fn !== opts.callback))
        }
      }
    },
    flush: async () => {},
    drain: async () => {},
    close: async () => {},
    isClosed: () => false
  }
}

function createMockConnectionManager (nc) {
  const listeners = []
  return {
    onReconnect (cb) {
      listeners.push(cb)
    },
    async getConnection () {
      return nc
    },
    async isAvailable () {
      return true
    },
    async shutdown () {},
    triggerReconnect () {
      return Promise.all(listeners.map((cb) => Promise.resolve(cb())))
    }
  }
}

function createMockWebSocket () {
  const ws = {
    readyState: WebSocket.OPEN,
    bufferedAmount: 0,
    _sent: [],
    send (data) {
      ws._sent.push(Buffer.from(data))
    },
    close: sinon.stub()
  }
  return ws
}

describe('NatsRelayTransportImpl', () => {
  def('sandbox', () => sinon.createSandbox())

  let nc
  let connectionManager
  let transport
  const execId = 'exec-session-1'
  const logSessionId = 'log-session-1'

  beforeEach(() => {
    nc = createMockNatsConnection()
    connectionManager = createMockConnectionManager(nc)
    transport = new NatsRelayTransportImpl(connectionManager, {
      get: (key, defaultValue) => {
        if (key === 'server.webSocket.relay.nats.maxPendingBytes') return 33554432
        if (key === 'server.webSocket.relay.nats.maxPendingMessages') return 8192
        if (key === 'server.webSocket.relay.nats.publishTimeoutMs') return 50
        return defaultValue
      }
    })
  })

  afterEach(() => {
    $sandbox.restore()
  })

  it('relays exec stdin from user publish to agent subscription', async () => {
    const userWs = createMockWebSocket()
    const agentWs = createMockWebSocket()

    await transport.enableForSession({ execId, user: userWs })
    await transport.enableForSession({ execId, agent: agentWs })

    const frame = Buffer.from('hello-from-user')
    await transport.publishToAgent(execId, frame)

    expect(agentWs._sent).to.have.length(1)
    expect(agentWs._sent[0].toString()).to.equal('hello-from-user')
  })

  it('relays exec stdout from agent publish to user subscription', async () => {
    const userWs = createMockWebSocket()
    const agentWs = createMockWebSocket()

    await transport.enableForSession({ execId, user: userWs })
    await transport.enableForSession({ execId, agent: agentWs })

    const frame = Buffer.from('hello-from-agent')
    await transport.publishToUser(execId, frame)

    expect(userWs._sent).to.have.length(1)
    expect(userWs._sent[0].toString()).to.equal('hello-from-agent')
  })

  it('forwards log lines to user websocket by sessionId', async () => {
    const userWs = createMockWebSocket()

    await transport.enableForLogSession({ sessionId: logSessionId, user: userWs })

    const line = msgpack.encode({
      type: 6,
      data: Buffer.from('line-1\n'),
      sessionId: logSessionId
    })

    nc.publish(logUserSubject(logSessionId), line)

    expect(userWs._sent).to.have.length(1)
    expect(msgpack.decode(userWs._sent[0]).data.toString()).to.equal('line-1\n')
  })

  it('drops log lines and emits LOG_ERROR when pending limits exceeded', async () => {
    const userWs = createMockWebSocket()
    const limitedTransport = new NatsRelayTransportImpl(connectionManager, {
      get: (key, defaultValue) => {
        if (key === 'server.webSocket.relay.nats.maxPendingBytes') return 32
        if (key === 'server.webSocket.relay.nats.maxPendingMessages') return 1
        if (key === 'server.webSocket.relay.nats.publishTimeoutMs') return 50
        return defaultValue
      }
    })

    await limitedTransport.enableForLogSession({ sessionId: logSessionId, user: userWs })
    const bridge = limitedTransport.logBridges.get(logSessionId)
    bridge.pendingMessages = 1
    bridge.pendingBytes = 32

    const line = msgpack.encode({
      type: 6,
      data: Buffer.from('overflow-line\n'),
      sessionId: logSessionId
    })

    nc.publish(logUserSubject(logSessionId), line)

    expect(userWs._sent).to.have.length(1)
    expect(msgpack.decode(userWs._sent[0]).type).to.equal(9)
  })

  it('re-subscribes active exec sessions after reconnect', async () => {
    const userWs = createMockWebSocket()
    const agentWs = createMockWebSocket()
    const recovery = sinon.stub()

    transport.onRecovery(recovery)
    await transport.enableForSession({ execId, user: userWs, agent: agentWs })

    expect(nc.subscriptions.get(execUserSubject(execId))).to.have.length(1)
    expect(nc.subscriptions.get(execAgentSubject(execId))).to.have.length(1)

    nc.subscriptions.clear()
    await connectionManager.triggerReconnect()

    expect(nc.subscriptions.get(execUserSubject(execId))).to.have.length(1)
    expect(nc.subscriptions.get(execAgentSubject(execId))).to.have.length(1)
    expect(recovery).to.have.been.calledOnceWith(execId, { kind: 'exec' })
  })

  it('fails exec publish when flush exceeds timeout', async () => {
    const slowNc = createMockNatsConnection()
    slowNc.flush = () => new Promise(() => {})
    const slowManager = createMockConnectionManager(slowNc)
    const slowTransport = new NatsRelayTransportImpl(slowManager, {
      get: (key, defaultValue) => {
        if (key === 'server.webSocket.relay.nats.publishTimeoutMs') return 20
        return defaultValue
      }
    })

    await slowTransport.enableForSession({ execId, user: createMockWebSocket() })

    await expect(slowTransport.publishToAgent(execId, Buffer.from('x')))
      .to.be.rejectedWith(/not flushed within 20ms/)
  })
})
