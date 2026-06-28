const { expect } = require('chai')
const sinon = require('sinon')

const {
  NatsRelayConnectionManager
} = require('../../../src/services/nats-relay-connection-manager')
const NatsInstanceManager = require('../../../src/data/managers/nats-instance-manager')
const NatsAccountManager = require('../../../src/data/managers/nats-account-manager')
const NatsUserManager = require('../../../src/data/managers/nats-user-manager')
const SecretService = require('../../../src/services/secret-service')
const NatsAuthService = require('../../../src/services/nats-auth-service')
const Constants = require('../../../src/helpers/constants')

describe('NatsRelayConnectionManager', () => {
  def('sandbox', () => sinon.createSandbox())

  const hubRecord = {
    host: 'hub.example.com',
    serverPort: 4222
  }

  const sampleCredsText = [
    '-----BEGIN NATS USER JWT-----',
    'test-jwt',
    '------END NATS USER JWT------',
    '',
    '-----BEGIN USER NKEY SEED-----',
    'SUATESTSEED',
    '------END USER NKEY SEED------',
    ''
  ].join('\n')

  function relayCredsSecretData (credsText = sampleCredsText) {
    return {
      'controller/controller.creds': credsText
    }
  }

  function createManager (overrides = {}) {
    const cfg = {
      get: sinon.stub().callsFake((key, defaultValue) => {
        if (key === 'app.namespace') return 'pot-ns'
        if (key === 'app.ControlPlane') return 'Remote'
        return defaultValue
      }),
      getBoolean: sinon.stub().returns(false)
    }

    return new NatsRelayConnectionManager({
      connectFn: overrides.connectFn || sinon.stub().resolves({ isClosed: () => false, status: async function * () {} }),
      config: cfg,
      maxReconnectAttempts: 0
    })
  }

  afterEach(() => {
    $sandbox.restore()
  })

  it('resolves remote hub hosts in fallback order', async () => {
    const manager = createManager()
    $sandbox.stub(NatsInstanceManager, 'findOne').resolves(hubRecord)
    $sandbox.stub(NatsAuthService, 'ensureControllerNatsAccount').resolves()
    $sandbox.stub(NatsAccountManager, 'findOne').resolves({ id: 1 })
    $sandbox.stub(NatsUserManager, 'findOne').resolves({ credsSecretName: 'nats-creds-controller-controller' })
    $sandbox.stub(SecretService, 'getSecretEndpoint').resolves({
      data: relayCredsSecretData()
    })

    const connectFn = sinon.stub().resolves({ isClosed: () => false, status: async function * () {} })
    manager._connectFn = connectFn

    await manager.getConnection()

    expect(connectFn).to.have.been.calledOnce
    const options = connectFn.firstCall.args[0]
    expect(options.servers).to.equal(`nats://${Constants.NATS_BRIDGE_DNS_SAN}:4222`)
    expect(NatsAuthService.ensureControllerNatsAccount).to.have.been.calledOnce
  })

  it('ensures controller NATS account before loading creds when hub exists', async () => {
    const manager = createManager()
    $sandbox.stub(NatsInstanceManager, 'findOne').resolves(hubRecord)
    const ensureStub = $sandbox.stub(NatsAuthService, 'ensureControllerNatsAccount').resolves()
    $sandbox.stub(NatsAccountManager, 'findOne').resolves({ id: 1 })
    $sandbox.stub(NatsUserManager, 'findOne').resolves({ credsSecretName: 'nats-creds-controller-controller' })
    $sandbox.stub(SecretService, 'getSecretEndpoint').resolves({
      data: relayCredsSecretData()
    })

    manager._connectFn = sinon.stub().resolves({ isClosed: () => false, status: async function * () {} })
    await manager.getConnection()

    expect(ensureStub).to.have.been.calledBefore(SecretService.getSecretEndpoint)
  })

  it('skips ensure when no hub record exists', async () => {
    const manager = createManager()
    $sandbox.stub(NatsInstanceManager, 'findOne').resolves(null)
    const ensureStub = $sandbox.stub(NatsAuthService, 'ensureControllerNatsAccount').resolves()

    await manager._ensureControllerNatsAccount()

    expect(ensureStub).to.not.have.been.called
  })

  it('resolves kubernetes hub service host first', async () => {
    const manager = createManager()
    manager._config.get = sinon.stub().callsFake((key, defaultValue) => {
      if (key === 'app.namespace') return 'prod'
      if (key === 'app.ControlPlane') return 'kubernetes'
      return defaultValue
    })

    const hosts = manager._buildHubHostList(hubRecord)
    expect(hosts[0]).to.equal('nats-server.prod.svc.cluster.local')
    expect(hosts).to.deep.equal([
      'nats-server.prod.svc.cluster.local',
      'hub.example.com'
    ])
  })

  it('resolves remote hub hosts without cluster.local fallback', () => {
    const manager = createManager()
    const hosts = manager._remoteHubHosts(hubRecord)

    expect(hosts).to.deep.equal([
      Constants.NATS_BRIDGE_DNS_SAN,
      hubRecord.host
    ])
  })

  it('uses hub serverPort for all remote connect attempts', async () => {
    const manager = createManager()
    const customPort = 14222
    $sandbox.stub(NatsInstanceManager, 'findOne').resolves({
      ...hubRecord,
      serverPort: customPort
    })
    $sandbox.stub(NatsAuthService, 'ensureControllerNatsAccount').resolves()
    $sandbox.stub(NatsAccountManager, 'findOne').resolves({ id: 1 })
    $sandbox.stub(NatsUserManager, 'findOne').resolves({ credsSecretName: 'nats-creds-controller-controller' })
    $sandbox.stub(SecretService, 'getSecretEndpoint').resolves({
      data: relayCredsSecretData()
    })

    const connectFn = sinon.stub().resolves({ isClosed: () => false, status: async function * () {} })
    manager._connectFn = connectFn

    await manager.getConnection()

    expect(connectFn.firstCall.args[0].servers).to.equal(`nats://${Constants.NATS_BRIDGE_DNS_SAN}:${customPort}`)
  })

  it('throws aggregate error listing all connect attempts', async () => {
    const manager = createManager()
    $sandbox.stub(NatsInstanceManager, 'findOne').resolves(hubRecord)
    $sandbox.stub(NatsAuthService, 'ensureControllerNatsAccount').resolves()
    $sandbox.stub(NatsAccountManager, 'findOne').resolves({ id: 1 })
    $sandbox.stub(NatsUserManager, 'findOne').resolves({ credsSecretName: 'nats-creds-controller-controller' })
    $sandbox.stub(SecretService, 'getSecretEndpoint').resolves({
      data: relayCredsSecretData()
    })

    manager._connectFn = sinon.stub().rejects(new Error('ECONNREFUSED'))

    try {
      await manager.getConnection()
      expect.fail('expected connect to fail')
    } catch (error) {
      expect(error.message).to.include(Constants.NATS_BRIDGE_DNS_SAN)
      expect(error.message).to.include(hubRecord.host)
      expect(error.message).to.include('ECONNREFUSED')
    }
  })

  it('loads opaque creds secret as plain UTF-8 text', async () => {
    const manager = createManager()
    $sandbox.stub(NatsInstanceManager, 'findOne').resolves(hubRecord)
    $sandbox.stub(NatsAuthService, 'ensureControllerNatsAccount').resolves()
    $sandbox.stub(NatsAccountManager, 'findOne').resolves({ id: 1 })
    $sandbox.stub(NatsUserManager, 'findOne').resolves({ credsSecretName: 'nats-creds-controller-controller' })
    $sandbox.stub(SecretService, 'getSecretEndpoint').resolves({
      data: relayCredsSecretData()
    })

    const creds = await manager._loadControllerRelayCreds()
    expect(Buffer.from(creds).toString('utf8')).to.equal(sampleCredsText)
  })

  it('reports unavailable when hub record is missing', async () => {
    const manager = createManager()
    $sandbox.stub(NatsInstanceManager, 'findOne').resolves(null)

    const available = await manager.isAvailable()
    expect(available).to.equal(false)
  })
})
