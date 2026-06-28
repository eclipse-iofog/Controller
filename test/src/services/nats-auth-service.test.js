const { expect } = require('chai')
const sinon = require('sinon')

const MicroserviceManager = require('../../../src/data/managers/microservice-manager')
const NatsAccountManager = require('../../../src/data/managers/nats-account-manager')
const NatsUserManager = require('../../../src/data/managers/nats-user-manager')
const NatsUserRuleManager = require('../../../src/data/managers/nats-user-rule-manager')
const NatsAccountRuleManager = require('../../../src/data/managers/nats-account-rule-manager')
const ApplicationManager = require('../../../src/data/managers/application-manager')
const NatsOperatorManager = require('../../../src/data/managers/nats-operator-manager')
const SecretService = require('../../../src/services/secret-service')
const NatsService = require('../../../src/services/nats-service')
const NatsAuthService = require('../../../src/services/nats-auth-service')
const NatsSystemRules = require('../../../src/config/nats-system-rules')
const { createOperator, createAccount } = require('@nats-io/nkeys')

function decodeJwtPayload (jwt) {
  const parts = jwt.split('.')
  return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'))
}

describe('NATS Auth Service', () => {
  def('sandbox', () => sinon.createSandbox())
  const transaction = {}

  afterEach(() => $sandbox.restore())

  describe('reissueUserForMicroservice', () => {
    const microserviceUuid = 'ms-uuid-1'
    const applicationId = 1
    const accountId = 10
    const userRuleId = 2
    const microservice = {
      uuid: microserviceUuid,
      applicationId,
      natsRuleId: userRuleId,
      natsAccess: true,
      name: 'box-1'
    }
    const account = { id: accountId, applicationId, seedSecretName: 'acc-seed' }
    const app = { id: applicationId, name: 'app1' }
    const defaultUserRule = { id: userRuleId, name: 'default-user' }
    const existingUserSameAccountSameRule = {
      id: 1,
      accountId,
      natsUserRuleId: userRuleId,
      microserviceUuid,
      publicKey: 'existing-pk',
      credsSecretName: 'nats-creds-app1-box-1',
      name: 'box-1'
    }
    const existingUserSameAccountDifferentRule = {
      id: 1,
      accountId,
      natsUserRuleId: 99,
      microserviceUuid,
      publicKey: 'existing-pk',
      credsSecretName: 'nats-creds-app1-box-1',
      name: 'box-1'
    }

    beforeEach(() => {
      $sandbox.stub(NatsAccountRuleManager, 'updateOrCreate').resolves()
      $sandbox.stub(NatsUserRuleManager, 'updateOrCreate').resolves()
      $sandbox.stub(MicroserviceManager, 'findOne').callsFake(({ uuid }) => {
        if (uuid === microserviceUuid) return Promise.resolve(microservice)
        return Promise.resolve(null)
      })
      $sandbox.stub(ApplicationManager, 'findOne').resolves(app)
      $sandbox.stub(NatsAccountManager, 'findOne').callsFake((query) => {
        if (query.applicationId === applicationId) return Promise.resolve(account)
        if (query.id === accountId) return Promise.resolve(account)
        return Promise.resolve(null)
      })
      $sandbox.stub(NatsUserRuleManager, 'findOne').resolves(defaultUserRule)
      $sandbox.stub(NatsService, 'enqueueReconcileTask').callsFake(() => Promise.resolve())
    })

    context('when existing user has same account and same rule (ensure-only)', () => {
      beforeEach(() => {
        $sandbox.stub(NatsUserManager, 'findOne').resolves(existingUserSameAccountSameRule)
        $sandbox.stub(NatsUserManager, 'update').resolves()
        $sandbox.stub(NatsUserManager, 'create').resolves()
        $sandbox.stub(SecretService, 'createSecretEndpoint').resolves()
        $sandbox.stub(SecretService, 'updateSecretEndpointIfChanged').resolves()
      })

      it('does not call NatsUserManager.update or create (no key rotation)', async () => {
        await NatsAuthService.reissueUserForMicroservice(microserviceUuid, transaction, { triggerReconcile: false })

        expect(NatsUserManager.update).to.not.have.been.called
        expect(NatsUserManager.create).to.not.have.been.called
      })

      it('does not call SecretService create or update (no secret overwrite)', async () => {
        await NatsAuthService.reissueUserForMicroservice(microserviceUuid, transaction, { triggerReconcile: false })

        expect(SecretService.createSecretEndpoint).to.not.have.been.called
        expect(SecretService.updateSecretEndpointIfChanged).to.not.have.been.called
      })

      it('returns the existing user', async () => {
        const result = await NatsAuthService.reissueUserForMicroservice(microserviceUuid, transaction, { triggerReconcile: false })

        expect(result).to.not.be.null
        expect(result.accountId).to.equal(accountId)
        expect(result.natsUserRuleId).to.equal(userRuleId)
      })
    })

    context('when existing user has same account but different rule (revoke and reissue)', () => {
      const operatorKp = createOperator()
      const accountKp = createAccount()
      const operatorSeed = new TextDecoder().decode(operatorKp.getSeed())
      const accountSeed = new TextDecoder().decode(accountKp.getSeed())

      beforeEach(() => {
        $sandbox.stub(NatsUserManager, 'findOne').resolves(existingUserSameAccountDifferentRule)
        $sandbox.stub(NatsUserManager, 'update').resolves()
        $sandbox.stub(NatsAccountManager, 'update').resolves()
        $sandbox.stub(SecretService, 'getSecretEndpoint').callsFake((secretName) => {
          if (secretName === 'op-seed') {
            return Promise.resolve({ data: { seed: operatorSeed } })
          }
          if (secretName === 'acc-seed') {
            return Promise.resolve({ data: { seed: accountSeed } })
          }
          return Promise.resolve(null)
        })
        $sandbox.stub(SecretService, 'createSecretEndpoint').resolves()
        $sandbox.stub(SecretService, 'updateSecretEndpointIfChanged').resolves()
        $sandbox.stub(NatsAccountRuleManager, 'findOne').resolves({ name: 'default-account' })
        const NatsOperatorManager = require('../../../src/data/managers/nats-operator-manager')
        $sandbox.stub(NatsOperatorManager, 'findOne').resolves({ seedSecretName: 'op-seed' })
      })

      it('updates account JWT (revocation) and user (new key)', async () => {
        await NatsAuthService.reissueUserForMicroservice(microserviceUuid, transaction)

        expect(NatsAccountManager.update).to.have.been.called
        expect(NatsUserManager.update).to.have.been.called
      })
    })
  })

  describe('ensureControllerNatsAccount', () => {
    const operatorKp = createOperator()
    const operatorSeed = new TextDecoder().decode(operatorKp.getSeed())
    const operator = {
      id: 1,
      name: 'test-operator',
      seedSecretName: 'nats-operator-seed',
      publicKey: operatorKp.getPublicKey()
    }
    const relayAccountRule = {
      id: 50,
      name: NatsSystemRules.CONTROLLER_ACCOUNT_RULE_NAME,
      maxConnections: -1,
      maxLeafNodeConnections: -1,
      maxData: -1,
      maxExports: -1,
      maxImports: -1,
      maxMsgPayload: -1,
      maxSubscriptions: -1,
      exportsAllowWildcards: true
    }
    const relayUserRule = {
      id: 51,
      name: NatsSystemRules.CONTROLLER_USER_RULE_NAME,
      bearerToken: false,
      allowedConnectionTypes: JSON.stringify(['STANDARD']),
      maxData: -1,
      maxSubscriptions: -1,
      maxPayload: -1,
      pubAllow: JSON.stringify([NatsSystemRules.CONTROLLER_NATS_RELAY_SUBJECT_ALLOW]),
      subAllow: JSON.stringify([NatsSystemRules.CONTROLLER_NATS_RELAY_SUBJECT_ALLOW])
    }
    let createdAccount
    let createdUser

    beforeEach(() => {
      createdAccount = null
      createdUser = null
      $sandbox.stub(NatsAccountRuleManager, 'updateOrCreate').resolves()
      $sandbox.stub(NatsUserRuleManager, 'updateOrCreate').resolves()
      $sandbox.stub(NatsService, 'enqueueReconcileTask').resolves()
      $sandbox.stub(NatsOperatorManager, 'findOne').resolves(operator)
      $sandbox.stub(SecretService, 'getSecretEndpoint').callsFake((secretName) => {
        if (secretName === operator.seedSecretName) {
          return Promise.resolve({ data: { seed: operatorSeed } })
        }
        if (secretName && secretName.startsWith('nats-account-seed-')) {
          const accountKp = createAccount()
          return Promise.resolve({ data: { seed: new TextDecoder().decode(accountKp.getSeed()) } })
        }
        return Promise.resolve(null)
      })
      $sandbox.stub(SecretService, 'createSecretEndpoint').resolves()
      $sandbox.stub(SecretService, 'updateSecretEndpointIfChanged').resolves()
      $sandbox.stub(NatsAccountRuleManager, 'findOne').callsFake(({ name }) => {
        if (name === NatsSystemRules.CONTROLLER_ACCOUNT_RULE_NAME) {
          return Promise.resolve(relayAccountRule)
        }
        if (name === NatsSystemRules.SYSTEM_ACCOUNT_RULE_NAME) {
          return Promise.resolve({ name: NatsSystemRules.SYSTEM_ACCOUNT_RULE_NAME })
        }
        if (name === NatsSystemRules.APPLICATION_ACCOUNT_RULE_NAME) {
          return Promise.resolve({ name: NatsSystemRules.APPLICATION_ACCOUNT_RULE_NAME })
        }
        return Promise.resolve(null)
      })
      $sandbox.stub(NatsUserRuleManager, 'findOne').callsFake(({ name }) => {
        if (name === NatsSystemRules.CONTROLLER_USER_RULE_NAME) {
          return Promise.resolve(relayUserRule)
        }
        if (name === NatsSystemRules.MICROSERVICE_USER_RULE_NAME) {
          return Promise.resolve({ name: NatsSystemRules.MICROSERVICE_USER_RULE_NAME })
        }
        return Promise.resolve(null)
      })
      $sandbox.stub(NatsAccountManager, 'findOne').callsFake((query) => {
        if (createdAccount && query.name === NatsAuthService.CONTROLLER_NATS_ACCOUNT_NAME) {
          return Promise.resolve(createdAccount)
        }
        if (createdAccount && query.id === createdAccount.id) {
          return Promise.resolve(createdAccount)
        }
        return Promise.resolve(null)
      })
      $sandbox.stub(NatsAccountManager, 'create').callsFake((data) => {
        createdAccount = { id: 100, ...data }
        return Promise.resolve(createdAccount)
      })
      $sandbox.stub(NatsUserManager, 'findOne').callsFake(({ accountId, name }) => {
        if (createdUser && accountId === createdAccount.id && name === NatsAuthService.CONTROLLER_NATS_USER_NAME) {
          return Promise.resolve(createdUser)
        }
        return Promise.resolve(null)
      })
      $sandbox.stub(NatsUserManager, 'create').callsFake((data) => {
        createdUser = { id: 200, ...data }
        return Promise.resolve(createdUser)
      })
    })

    it('creates controller NATS account and user with scoped pub/sub JWT claims', async () => {
      const result = await NatsAuthService.ensureControllerNatsAccount(transaction, { triggerReconcile: false })

      expect(result.account.name).to.equal(NatsAuthService.CONTROLLER_NATS_ACCOUNT_NAME)
      expect(result.user.name).to.equal(NatsAuthService.CONTROLLER_NATS_USER_NAME)
      expect(result.user.credsSecretName).to.equal(NatsAuthService.controllerNatsCredsSecretName())

      const payload = decodeJwtPayload(result.user.jwt)
      expect(payload.nats.pub.allow).to.deep.equal([NatsSystemRules.CONTROLLER_NATS_RELAY_SUBJECT_ALLOW])
      expect(payload.nats.sub.allow).to.deep.equal([NatsSystemRules.CONTROLLER_NATS_RELAY_SUBJECT_ALLOW])
      expect(NatsAccountManager.create).to.have.been.calledOnce
      expect(NatsUserManager.create).to.have.been.calledOnce
    })

    it('is idempotent when account and user already exist', async () => {
      createdAccount = {
        id: 100,
        name: NatsAuthService.CONTROLLER_NATS_ACCOUNT_NAME,
        applicationId: null,
        isSystem: false,
        isLeafSystem: false,
        seedSecretName: 'nats-account-seed-controller'
      }
      createdUser = {
        id: 200,
        accountId: createdAccount.id,
        name: NatsAuthService.CONTROLLER_NATS_USER_NAME,
        credsSecretName: NatsAuthService.controllerNatsCredsSecretName(),
        jwt: 'existing.jwt.token'
      }

      const result = await NatsAuthService.ensureControllerNatsAccount(transaction, { triggerReconcile: false })

      expect(result.account).to.equal(createdAccount)
      expect(result.user).to.equal(createdUser)
      expect(NatsAccountManager.create).to.not.have.been.called
      expect(NatsUserManager.create).to.not.have.been.called
    })
  })
})
