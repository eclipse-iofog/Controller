const { expect } = require('chai')
const sinon = require('sinon')

const config = require('../../../src/config')
const AmqpRelayTransport = require('../../../src/services/amqp-relay-transport')
const NatsRelayTransport = require('../../../src/services/nats-relay-transport')
const {
  resolveTransport,
  resetTransportForTests
} = require('../../../src/services/ws-relay-transport-factory')

describe('ws-relay-transport-factory', () => {
  def('sandbox', () => sinon.createSandbox())

  afterEach(() => {
    $sandbox.restore()
    resetTransportForTests()
  })

  it('selects amqp when nats.enabled is false', () => {
    $sandbox.stub(config, 'getBoolean').callsFake((key, defaultValue = false) => {
      if (key === 'nats.enabled') return false
      return defaultValue
    })

    const transport = resolveTransport()
    expect(transport).to.be.instanceOf(AmqpRelayTransport)
    expect(transport.getTransport()).to.equal('amqp')
  })

  it('selects nats transport when nats.enabled is true', () => {
    $sandbox.stub(config, 'getBoolean').callsFake((key, defaultValue = false) => {
      if (key === 'nats.enabled') return true
      return defaultValue
    })

    const transport = resolveTransport()
    expect(transport).to.be.instanceOf(NatsRelayTransport)
    expect(transport.getTransport()).to.equal('nats')
  })

  it('returns the same singleton instance on repeated calls', () => {
    $sandbox.stub(config, 'getBoolean').callsFake((key, defaultValue = false) => {
      if (key === 'nats.enabled') return false
      return defaultValue
    })

    const first = resolveTransport()
    const second = resolveTransport()
    expect(first).to.equal(second)
  })
})
