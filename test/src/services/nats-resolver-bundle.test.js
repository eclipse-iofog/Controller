const { expect } = require('chai')
const sinon = require('sinon')
const { Op } = require('sequelize')

const NatsAccountManager = require('../../../src/data/managers/nats-account-manager')
const NatsInstanceManager = require('../../../src/data/managers/nats-instance-manager')
const NatsAccountRuleManager = require('../../../src/data/managers/nats-account-rule-manager')
const NatsConnectionManager = require('../../../src/data/managers/nats-connection-manager')
const ConfigMapManager = require('../../../src/data/managers/config-map-manager')
const FogManager = require('../../../src/data/managers/iofog-manager')
const ApplicationManager = require('../../../src/data/managers/application-manager')
const MicroserviceManager = require('../../../src/data/managers/microservice-manager')
const ConfigMapService = require('../../../src/services/config-map-service')
const NatsAuthService = require('../../../src/services/nats-auth-service')
const config = require('../../../src/config')
const transactionRunner = require('../../../src/helpers/transaction-runner')

describe('NATS resolver bundle freshness', () => {
  def('sandbox', () => sinon.createSandbox())
  const transaction = {}

  afterEach(() => {
    $sandbox.restore()
  })

  it('uses refreshed account JWT in leaf bundle after in-reconcile reissue', async () => {
    const fog = { uuid: 'fog-leaf-1', name: 'leaf-fog' }
    const app = { id: 10, natsAccess: true, isSystem: false, natsRuleId: null }
    const microservice = {
      uuid: 'ms-1',
      applicationId: 10,
      iofogUuid: fog.uuid,
      natsAccess: true
    }
    const staleAccount = {
      id: 100,
      applicationId: 10,
      publicKey: 'STALEPK',
      jwt: 'stale.jwt.token'
    }
    const freshAccount = {
      id: 100,
      applicationId: 10,
      publicKey: 'STALEPK',
      jwt: 'fresh.jwt.token'
    }

    $sandbox.stub(config, 'getBoolean').returns(false)
    $sandbox.stub(config, 'get').callsFake((key, defaultValue) => defaultValue)
    $sandbox.stub(transactionRunner, 'isSqliteProvider').returns(false)
    $sandbox.stub(transactionRunner, 'runInTransaction').callsFake(async (fn) => fn(transaction))
    $sandbox.stub(FogManager, 'findAll').resolves([fog])
    $sandbox.stub(ApplicationManager, 'findAll').resolves([app])
    $sandbox.stub(NatsInstanceManager, 'findAll').resolves([{ iofogUuid: fog.uuid, isLeaf: true, isHub: false }])
    $sandbox.stub(NatsConnectionManager, 'findAllWithNats').resolves([])
    $sandbox.stub(MicroserviceManager, 'findAll').callsFake((query) => {
      if (query.name) {
        return Promise.resolve([{ uuid: 'nats-ms', iofogUuid: fog.uuid, name: 'nats' }])
      }
      return Promise.resolve([microservice])
    })
    $sandbox.stub(NatsAccountRuleManager, 'findOne').resolves({ id: 1, name: 'default-account' })
    $sandbox.stub(NatsAccountManager, 'findAll').callsFake((query) => {
      if (query.isSystem) {
        return Promise.resolve([])
      }
      if (query.applicationId && query.applicationId[Op.in]) {
        return Promise.resolve([freshAccount])
      }
      return Promise.resolve([staleAccount])
    })
    $sandbox.stub(NatsAccountManager, 'findOne').resolves(null)
    $sandbox.stub(NatsAuthService, 'ensureSystemAccount').resolves()
    $sandbox.stub(NatsAuthService, 'ensureLeafSystemAccount').resolves({
      publicKey: 'LEAFSYS',
      jwt: 'leaf-sys.jwt'
    })
    $sandbox.stub(NatsAuthService, 'reissueUserForMicroservice').callsFake(async () => {
      staleAccount.jwt = freshAccount.jwt
    })
    $sandbox.stub(ConfigMapManager, 'getConfigMap').resolves(null)

    const capturedBundles = []
    $sandbox.stub(ConfigMapService, 'createConfigMapEndpoint').callsFake(async (payload) => {
      capturedBundles.push(payload.data)
      return payload
    })

    const NatsService = require('../../../src/services/nats-service')
    await NatsService.reconcileResolverArtifacts({
      reason: 'account-created',
      applicationId: 10,
      fogUuids: [fog.uuid]
    })

    const leafBundle = capturedBundles.find((bundle) => bundle && bundle['STALEPK.jwt'])
    expect(leafBundle).to.not.equal(undefined)
    expect(leafBundle['STALEPK.jwt']).to.equal('fresh.jwt.token')
  })
})
