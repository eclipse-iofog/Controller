const { expect } = require('chai')
const sinon = require('sinon')

const RouterController = require('../../../src/controllers/router-controller')
const RouterService = require('../../../src/services/router-service')

describe('Router Controller', () => {
  def('subject', () => RouterController)
  def('sandbox', () => sinon.createSandbox())

  afterEach(() => $sandbox.restore())

  describe('.getRouterEndPoint()', () => {
    def('subject', () => $subject.getRouterEndPoint())

    const defaultRouter = {
      id: 42
    }

    beforeEach(() => {
      $sandbox.stub(RouterService, 'getDefaultRouter').returns(Promise.resolve(defaultRouter))
    })

    it('Should call RouterService.getDefaultRouter', async () => {
      expect(await $subject).to.eql(defaultRouter)
      return expect(RouterService.getDefaultRouter).to.have.been.calledOnceWith()
    })
  })

  describe('.upsertDefaultRouter()', () => {
    const defaultRouterData = {
      edgeRouterPort: 56722,
      interRouterPort: 56721,
      messagingPort: 5672,
      host: 'defaultRouterHost',
    }
    def('req', () => ({
      body: defaultRouterData
    }))
    def('subject', () => $subject.upsertDefaultRouter($req))

    beforeEach(() => {
      $sandbox.stub(RouterService, 'upsertDefaultRouter').returns(Promise.resolve(null))
    })

    it('Should call RouterService.upsertDefaultRouter', async () => {
      expect(await $subject).to.eql(null)
      return expect(RouterService.upsertDefaultRouter).to.have.been.calledOnceWith(defaultRouterData)
    })
  })
})