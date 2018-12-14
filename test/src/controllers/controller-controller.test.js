const {expect} = require('chai');
const sinon = require('sinon');

const Controller = require('../../../src/controllers/controller');
const ControllerService = require('../../../src/services/controller-service');

describe('Controller', () => {
  def('subject', () => Controller);
  def('sandbox', () => sinon.createSandbox());

  afterEach(() => $sandbox.restore());

  describe('.statusControllerEndPoint()', () => {
    def('req', () => ({
      body: {}
    }));

    def('response', () => Promise.resolve());
    def('subject', () => $subject.statusControllerEndPoint($req));

    beforeEach(() => {
      $sandbox.stub(ControllerService, 'statusController').returns($response);
    });

    it('calls ControllerService.statusController with correct args', async () => {
      await $subject;
      expect(ControllerService.statusController).to.have.been.calledWith(false);
    });

    context('when ControllerService#statusController fails', () => {
      const error = 'Error!';

      def('response', () => Promise.reject(error));

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    });

    context('when ControllerService#statusController succeeds', () => {
      it(`succeeds`, () => {
        return expect($subject).to.eventually.equal(undefined)
      })
    })
  });

  describe('.emailActivationEndPoint()', () => {
    def('req', () => ({
      body: {}
    }));
    def('response', () => Promise.resolve());
    def('subject', () => $subject.emailActivationEndPoint($req, $user));

    beforeEach(() => {
      $sandbox.stub(ControllerService, 'emailActivation').returns($response);
    });

    it('calls ControllerService.emailActivation with correct args', async () => {
      await $subject;
      expect(ControllerService.emailActivation).to.have.been.calledWith(false)
    });

    context('when ControllerService#emailActivation fails', () => {
      const error = 'Error!';

      def('response', () => Promise.reject(error));

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    });

    context('when ControllerService#emailActivation succeeds', () => {
      it(`succeeds`, () => {
        return expect($subject).to.eventually.equal(undefined)
      })
    })

  });

  describe('.fogTypesEndPoint()', () => {
    def('req', () => ({
      body: {}
    }));

    def('response', () => Promise.resolve());
    def('subject', () => $subject.fogTypesEndPoint($req, $user));

    beforeEach(() => {
      $sandbox.stub(ControllerService, 'getFogTypes').returns($response);
    });

    it('calls ControllerService.getFogTypes with correct args', async () => {
      await $subject;
      expect(ControllerService.getFogTypes).to.have.been.calledWith(false);
    });

    context('when ControllerService#getFogTypes fails', () => {
      const error = 'Error!';

      def('response', () => Promise.reject(error));

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    });

    context('when ControllerService#getFogTypes succeeds', () => {
      it(`succeeds`, () => {
        return expect($subject).to.eventually.equal(undefined)
      })
    })
  });

});