const { expect } = require('chai')
const sinon = require('sinon')

const ReconcileOutboxManager = require('../../../src/data/managers/reconcile-outbox-manager')
const NatsAuthService = require('../../../src/services/nats-auth-service')

describe('NATS auth orchestration', () => {
  def('sandbox', () => sinon.createSandbox())

  afterEach(() => {
    $sandbox.restore()
  })

  describe('scheduleReissueForAccountRule', () => {
    it('does not enqueue reconcile outbox synchronously when scheduling reissue', () => {
      const enqueueSpy = $sandbox.spy(ReconcileOutboxManager, 'enqueueNats')

      NatsAuthService.scheduleReissueForAccountRule(7)

      expect(enqueueSpy).to.not.have.been.called
    })
  })

  describe('scheduleReissueForUserRule', () => {
    it('does not enqueue reconcile outbox synchronously when scheduling reissue', () => {
      const enqueueSpy = $sandbox.spy(ReconcileOutboxManager, 'enqueueNats')

      NatsAuthService.scheduleReissueForUserRule(9)

      expect(enqueueSpy).to.not.have.been.called
    })
  })
})
