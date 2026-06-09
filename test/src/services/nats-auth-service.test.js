const { expect } = require('chai')
const sinon = require('sinon')

const MicroserviceManager = require('../../../src/data/managers/microservice-manager')
const NatsAccountManager = require('../../../src/data/managers/nats-account-manager')
const NatsUserManager = require('../../../src/data/managers/nats-user-manager')
const NatsUserRuleManager = require('../../../src/data/managers/nats-user-rule-manager')
const NatsAccountRuleManager = require('../../../src/data/managers/nats-account-rule-manager')
const ApplicationManager = require('../../../src/data/managers/application-manager')
const SecretService = require('../../../src/services/secret-service')
const NatsService = require('../../../src/services/nats-service')
const NatsAuthService = require('../../../src/services/nats-auth-service')

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
      beforeEach(() => {
        $sandbox.stub(NatsUserManager, 'findOne').resolves(existingUserSameAccountDifferentRule)
        $sandbox.stub(NatsUserManager, 'update').resolves()
        $sandbox.stub(NatsAccountManager, 'update').resolves()
        $sandbox.stub(SecretService, 'getSecretEndpoint').resolves({ data: { seed: 'operator-seed-base64' } })
        $sandbox.stub(SecretService, 'createSecretEndpoint').resolves()
        $sandbox.stub(SecretService, 'updateSecretEndpointIfChanged').resolves()
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
})
