const {expect} = require('chai')
const sinon = require('sinon')

const TunnelController = require('../../../src/controllers/tunnel-controller')
const TunnelService = require('../../../src/services/tunnel-service')

describe('Tunnel Controller', () => {
  def('subject', () => TunnelController)
  def('sandbox', () => sinon.createSandbox())

  afterEach(() => $sandbox.restore())

  describe('.manageTunnelEndPoint()', () => {
    def('action', () => 'open')
    def('id', () => 1)
    def('req', () => ({
      body: {
        action: $action,
      },
      params: {
        id: $id,
      },
    }))
    def('user', () => 'user!')
    def('response', () => Promise.resolve())
    def('subject', () => $subject.manageTunnelEndPoint($req, $user))

    beforeEach(() => {
      $sandbox.stub(TunnelService, 'openTunnel').returns($response)
      $sandbox.stub(TunnelService, 'closeTunnel').returns($response)
    })

    context('when action is "open"', async () => {
      it('calls TunnelService#openTunnel with correct args', async () => {
        await $subject
        expect(TunnelService.openTunnel).to.have.been.calledWith({iofogUuid: $id}, $user, false)
      })

      context('when TunnelService#openTunnel fails', () => {
        const error = 'Error!'

        def('response', () => Promise.reject(error))

        it(`fails with "${error}"`, () => {
          return expect($subject).to.be.rejectedWith(error)
        })
      })

      context('when TunnelService#openTunnel succeeds', () => {
        it(`succeeds`, () => {
          return expect($subject).to.eventually.equal(undefined)
        })
      })
    })

    context('when action is "close"', async () => {
      def('action', () => 'close')

      it('calls TunnelService#closeTunnel with correct args', async () => {
        await $subject
        expect(TunnelService.closeTunnel).to.have.been.calledWith({iofogUuid: $id}, $user)
      })

      context('when TunnelService#closeTunnel fails', () => {
        const error = 'Error!'

        def('response', () => Promise.reject(error))

        it(`fails with "${error}"`, () => {
          return expect($subject).to.be.rejectedWith(error)
        })
      })

      context('when TunnelService#closeTunnel succeeds', () => {
        it(`succeeds`, () => {
          return expect($subject).to.eventually.equal(undefined)
        })
      })
    })

    context('when action is neither "open" nor "close"', () => {
      def('action', () => 'invalid-action')

      it('throws an error', () => {
        return expect($subject).to.be.rejectedWith('Unknown action property. Action can be "open" or "close"')
      })
    })
  })

  describe('.getTunnelEndPoint()', () => {
    def('id', () => 1)
    def('req', () => ({
      body: {
        action: $action,
      },
      params: {
        id: $id,
      },
    }))
    def('user', () => 'user!')
    def('response', () => Promise.resolve())
    def('subject', () => $subject.getTunnelEndPoint($req, $user))

    beforeEach(() => {
      $sandbox.stub(TunnelService, 'findTunnel').returns($response)
    })

    it('calls TunnelService#findTunnel with correct args', async () => {
      await $subject
      expect(TunnelService.findTunnel).to.have.been.calledWith({iofogUuid: $id}, $user)
    })

    context('when TunnelService#findTunnel fails', () => {
      const error = 'Error!'

      def('response', () => Promise.reject(error))

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when TunnelService#findTunnel succeeds', () => {
      it(`succeeds`, () => {
        return expect($subject).to.eventually.equal(undefined)
      })
    })
  })
})
