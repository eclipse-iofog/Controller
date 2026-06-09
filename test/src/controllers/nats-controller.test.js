const { expect } = require('chai')
const sinon = require('sinon')

const NatsController = require('../../../src/controllers/nats-controller')
const NatsApiService = require('../../../src/services/nats-api-service')
const Errors = require('../../../src/helpers/errors')

describe('NATS Controller', () => {
  def('subject', () => NatsController)
  def('sandbox', () => sinon.createSandbox())

  afterEach(() => $sandbox.restore())

  describe('.getOperatorEndPoint()', () => {
    const operator = {
      name: 'datasance',
      publicKey: 'OPUB123',
      jwt: 'OPJWT'
    }

    beforeEach(() => {
      $sandbox.stub(NatsApiService, 'getOperator').returns(Promise.resolve(operator))
    })

    it('should return operator metadata', async () => {
      const response = await $subject.getOperatorEndPoint()
      expect(response).to.eql({
        name: operator.name,
        publicKey: operator.publicKey,
        jwt: operator.jwt
      })
    })
  })

  describe('.rotateOperatorEndPoint()', () => {
    const operator = {
      name: 'datasance',
      publicKey: 'OPUB456',
      jwt: 'OPJWT2'
    }

    beforeEach(() => {
      $sandbox.stub(NatsApiService, 'rotateOperator').returns(Promise.resolve(operator))
    })

    it('should return rotated operator metadata', async () => {
      const response = await $subject.rotateOperatorEndPoint()
      expect(response).to.eql({
        name: operator.name,
        publicKey: operator.publicKey,
        jwt: operator.jwt
      })
    })
  })

  describe('.getHubEndPoint()', () => {
    const hub = {
      host: 'hub-host',
      serverPort: 4222,
      clusterPort: 6222,
      leafPort: 7422,
      mqttPort: 8883,
      httpPort: 8222
    }

    beforeEach(() => {
      $sandbox.stub(NatsApiService, 'getHub').returns(Promise.resolve(hub))
    })

    it('should return hub metadata', async () => {
      const response = await $subject.getHubEndPoint()
      expect(response).to.eql(hub)
    })
  })

  describe('.upsertHubEndPoint()', () => {
    const hub = {
      host: 'hub-host',
      serverPort: 4222,
      clusterPort: 6222,
      leafPort: 7422,
      mqttPort: 8883,
      httpPort: 8222
    }

    def('req', () => ({
      body: {
        host: hub.host
      }
    }))

    beforeEach(() => {
      $sandbox.stub(NatsApiService, 'upsertHub').returns(Promise.resolve(hub))
    })

    it('should return upserted hub metadata', async () => {
      const response = await $subject.upsertHubEndPoint($req)
      expect(response).to.eql(hub)
    })
  })

  describe('.listAccountsEndPoint()', () => {
    const payload = { accounts: [{ id: 1, name: 'app1' }] }

    beforeEach(() => {
      $sandbox.stub(NatsApiService, 'listAccounts').returns(Promise.resolve(payload))
    })

    it('should map accounts list', async () => {
      const response = await $subject.listAccountsEndPoint()
      expect(response).to.eql(payload)
    })
  })

  describe('.getAccountEndPoint()', () => {
    const account = { id: 4, name: 'app2' }

    def('req', () => ({
      params: { appName: 'app2' }
    }))

    beforeEach(() => {
      $sandbox.stub(NatsApiService, 'getAccount').returns(Promise.resolve(account))
    })

    it('should return account metadata', async () => {
      const response = await $subject.getAccountEndPoint($req)
      expect(response).to.eql(account)
    })
  })

  describe('.ensureAccountEndPoint()', () => {
    const account = { id: 5, name: 'app-ensure' }

    def('req', () => ({
      params: { appName: 'app-ensure' },
      body: { natsRule: 'default-account' }
    }))

    beforeEach(() => {
      $sandbox.stub(NatsApiService, 'ensureAccount').returns(Promise.resolve(account))
    })

    it('should pass appName and body to ensureAccount', async () => {
      const response = await $subject.ensureAccountEndPoint($req)
      expect(response).to.eql(account)
      expect(NatsApiService.ensureAccount).to.have.been.calledWith('app-ensure', { natsRule: 'default-account' })
    })
  })

  describe('.listAllUsersEndPoint()', () => {
    const payload = {
      users: [
        { id: 1, name: 'u1', accountId: 10, accountName: 'acc1', applicationId: 100, applicationName: 'app1', isBearer: false, microserviceUuid: null }
      ]
    }

    beforeEach(() => {
      $sandbox.stub(NatsApiService, 'listAllUsers').returns(Promise.resolve(payload))
    })

    it('should return all users with account/application context', async () => {
      const response = await $subject.listAllUsersEndPoint()
      expect(response).to.eql(payload)
      expect(NatsApiService.listAllUsers).to.have.been.calledOnce()
    })
  })

  describe('.listUsersEndPoint()', () => {
    def('req', () => ({ params: { appName: 'app4' } }))

    beforeEach(() => {
      $sandbox.stub(NatsApiService, 'listUsers').returns(Promise.resolve({ users: [] }))
    })

    it('should return users for account', async () => {
      const response = await $subject.listUsersEndPoint($req)
      expect(response.users).to.eql([])
      expect(NatsApiService.listUsers).to.have.been.calledWith('app4')
    })
  })

  describe('.createUserEndPoint()', () => {
    const user = {
      id: 12,
      name: 'user1',
      publicKey: 'UPUB',
      jwt: 'UJWT',
      isBearer: false
    }

    def('req', () => ({
      params: { appName: 'app3' },
      body: { name: user.name, expiresIn: '7d' }
    }))

    beforeEach(() => {
      $sandbox.stub(NatsApiService, 'createUser').returns(Promise.resolve(user))
    })

    it('should create and return user metadata', async () => {
      const response = await $subject.createUserEndPoint($req)
      expect(response).to.eql({
        id: user.id,
        name: user.name,
        publicKey: user.publicKey,
        jwt: user.jwt,
        isBearer: user.isBearer
      })
      expect(NatsApiService.createUser).to.have.been.calledWith('app3', { name: user.name, expiresIn: '7d' })
    })

    it('should pass only name, expiresIn, natsRule to createUser (external user, no microserviceUuid)', async () => {
      const reqWithRule = {
        params: { appName: 'app3' },
        body: { name: 'ext-user', expiresIn: '1d', natsRule: 'default-user' }
      }
      await $subject.createUserEndPoint(reqWithRule)
      expect(NatsApiService.createUser).to.have.been.calledWith('app3', { name: 'ext-user', expiresIn: '1d', natsRule: 'default-user' })
    })
  })

  describe('.getUserCredsEndPoint()', () => {
    const secret = { credsBase64: 'Q1JFRFM=' }

    def('req', () => ({
      params: { appName: 'app5', userName: 'user-creds' }
    }))

    beforeEach(() => {
      $sandbox.stub(NatsApiService, 'getUserCreds').returns(Promise.resolve(secret))
    })

    it('should return creds as base64 payload', async () => {
      const response = await $subject.getUserCredsEndPoint($req)
      expect(response).to.eql(secret)
      expect(response).to.have.property('credsBase64')
      expect(response).to.not.have.property('creds')
    })
  })

  describe('.deleteUserEndPoint()', () => {
    def('req', () => ({
      params: { appName: 'app7', userName: 'user-del' }
    }))

    beforeEach(() => {
      $sandbox.stub(NatsApiService, 'deleteUser').returns(Promise.resolve())
    })

    it('should call deleteUser with appName and userName', async () => {
      await $subject.deleteUserEndPoint($req)
      expect(NatsApiService.deleteUser).to.have.been.calledWith('app7', 'user-del')
    })
  })

  describe('.deleteMqttBearerEndPoint()', () => {
    def('req', () => ({
      params: { appName: 'app8', userName: 'mqtt-del' }
    }))

    beforeEach(() => {
      $sandbox.stub(NatsApiService, 'deleteMqttBearer').returns(Promise.resolve())
    })

    it('should call deleteMqttBearer with appName and userName', async () => {
      await $subject.deleteMqttBearerEndPoint($req)
      expect(NatsApiService.deleteMqttBearer).to.have.been.calledWith('app8', 'mqtt-del')
    })
  })

  describe('.createMqttBearerEndPoint()', () => {
    const user = { id: 11, name: 'mqtt-user', publicKey: 'MPUB' }
    const bearerJwt = 'MJW'

    def('req', () => ({
      params: { appName: 'app6' },
      body: { name: user.name, expiresIn: '7d' }
    }))

    beforeEach(() => {
      $sandbox.stub(NatsApiService, 'createMqttBearer').returns(Promise.resolve({
        id: user.id,
        name: user.name,
        publicKey: user.publicKey,
        jwt: bearerJwt
      }))
    })

    it('should return bearer JWT', async () => {
      const response = await $subject.createMqttBearerEndPoint($req)
      expect(response).to.eql({
        id: user.id,
        name: user.name,
        publicKey: user.publicKey,
        jwt: bearerJwt
      })
      expect(NatsApiService.createMqttBearer).to.have.been.calledWith('app6', { name: user.name, expiresIn: '7d' })
    })
  })

  describe('.listAccountRulesEndPoint()', () => {
    beforeEach(() => {
      $sandbox.stub(NatsApiService, 'listAccountRules').returns(Promise.resolve({
        rules: [{ name: 'default-system-account-rule' }, { name: 'default-application-account-rule' }, { name: 'acc-rule' }]
      }))
    })

    it('should return account rule list', async () => {
      const response = await $subject.listAccountRulesEndPoint()
      expect(response.rules.some((rule) => rule.name === 'default-system-account-rule')).to.eql(true)
      expect(response.rules.some((rule) => rule.name === 'default-application-account-rule')).to.eql(true)
      expect(response.rules.some((rule) => rule.name === 'acc-rule')).to.eql(true)
    })
  })

  describe('.createAccountRuleEndPoint()', () => {
    def('req', () => ({
      body: { name: 'default-system-account-rule' }
    }))

    it('rejects reserved rule names', async () => {
      $sandbox.stub(NatsApiService, 'createAccountRule').throws(new Errors.ValidationError('Rule default-system-account-rule is reserved and immutable'))
      try {
        await $subject.createAccountRuleEndPoint($req)
      } catch (error) {
        expect(error).to.be.instanceof(Errors.ValidationError)
        expect(error.message).to.contain('reserved and immutable')
      }
    })
  })

  describe('.updateUserRuleEndPoint()', () => {
    def('req', () => ({
      params: { ruleName: 'user-rule' },
      body: { maxSubscriptions: 100 }
    }))

    beforeEach(() => {
      $sandbox.stub(NatsApiService, 'updateUserRule').returns(Promise.resolve({ id: 11, name: 'user-rule', maxSubscriptions: 100 }))
    })

    it('reissues user JWTs after rule update', async () => {
      const response = await $subject.updateUserRuleEndPoint($req)
      expect(response.maxSubscriptions).to.eql(100)
      expect(NatsApiService.updateUserRule).to.have.been.calledWith('user-rule', { maxSubscriptions: 100 })
    })
  })

  describe('.deleteAccountRuleEndPoint()', () => {
    def('req', () => ({
      params: { ruleName: 'custom-acc-rule' }
    }))

    beforeEach(() => {
      $sandbox.stub(NatsApiService, 'deleteAccountRule').returns(Promise.resolve())
    })

    it('falls back bound applications and schedules reissue', async () => {
      await $subject.deleteAccountRuleEndPoint($req)
      expect(NatsApiService.deleteAccountRule).to.have.been.calledWith('custom-acc-rule')
    })
  })

  describe('.deleteUserRuleEndPoint()', () => {
    def('req', () => ({
      params: { ruleName: 'custom-user-rule' }
    }))

    beforeEach(() => {
      $sandbox.stub(NatsApiService, 'deleteUserRule').returns(Promise.resolve())
    })

    it('falls back bound microservices and schedules reissue', async () => {
      await $subject.deleteUserRuleEndPoint($req)
      expect(NatsApiService.deleteUserRule).to.have.been.calledWith('custom-user-rule')
    })
  })
})
