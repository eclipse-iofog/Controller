const { expect } = require('chai');
const sinon = require('sinon');

const AccessTokenManager = require('../../../src/sequelize/managers/access-token-manager');
const AccessTokenService = require('../../../src/services/access-token-service');

describe('AccessToken Service', () => {
  def('subject', () => AccessTokenService);
  def('sandbox', () => sinon.createSandbox());

  afterEach(() => $sandbox.restore());

  describe('.createAccessToken()', () => {
    const accessToken = "accessToken";
    const transaction = {};
    const error = 'Error!';

    def('accessTokenObj', () => 'accessTokenResponse');

    def('subject', () => $subject.createAccessToken(accessToken, transaction));
    def('accessTokenResponse', () => Promise.resolve($accessTokenObj));

    beforeEach(() => {
      $sandbox.stub(AccessTokenManager, 'create').returns($accessTokenResponse);
    });

    it('calls AccessTokenManager#create() with correct args', async () => {
      await $subject;
      expect(AccessTokenManager.create).to.have.been.calledWith(accessToken, transaction);
    });

    context('when AccessTokenManager#create() fails', () => {
      def('accessTokenResponse', () => Promise.reject(error));

      it(`fails with ${error}`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    });

    context('when AccessTokenManager#create() succeeds', () => {
      it('fulfills the promise', () => {
        return expect($subject).to.eventually.equal($accessTokenObj)
      })
    })
  });

  describe('.removeAccessTokenByUserId()', () => {
    const userId = 15;
    const transaction = {};
    const error = 'Error!';

    def('removeTokenObj', () => 'removeToken');

    def('subject', () => $subject.removeAccessTokenByUserId(userId, transaction));
    def('removeTokenResponse', () => Promise.resolve($removeTokenObj));

    beforeEach(() => {
      $sandbox.stub(AccessTokenManager, 'delete').returns($removeTokenResponse);
    });

    it('calls AccessTokenManager#delete() with correct args', async () => {
      await $subject;
      expect(AccessTokenManager.delete).to.have.been.calledWith({
        userId: userId
      }, transaction);
    });

    context('when AccessTokenManager#delete() fails', () => {
      def('removeTokenResponse', () => Promise.reject(error));

      it(`fails with ${error}`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    });

    context('when AccessTokenManager#delete() succeeds', () => {
      it('fulfills the promise', () => {
        return expect($subject).to.eventually.equal($removeTokenObj)
      })
    })
  })

});