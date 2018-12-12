const {expect} = require('chai');
const sinon = require('sinon');

const RegistryController = require('../../../src/controllers/registry-controller');
const RegistryService = require('../../../src/services/registry-service');

describe('Registry Controller', () => {
  def('subject', () => RegistryController);
  def('sandbox', () => sinon.createSandbox());

  afterEach(() => $sandbox.restore());

  describe('.createRegistryEndPoint()', () => {
    def('user', () => 'user!');

    def('url', () => 'url');
    def('isPublic', () => true);
    def('username', () => 'testUsername');
    def('password', () => 'testPassword');
    def('email', () => 'test@gmail.com');
    def('requiresCert', () => true);
    def('certificate', () => "certificateString");

    def('req', () => ({
      body: {
        url: $url,
        isPublic: $isPublic,
        username: $username,
        password: $password,
        email: $email,
        requiresCert: $requiresCert,
        certificate: $certificate
      }
    }));

    def('response', () => Promise.resolve());
    def('subject', () => $subject.createRegistryEndPoint($req, $user));

    beforeEach(() => {
      $sandbox.stub(RegistryService, 'createRegistry').returns($response);
    });

    it('calls RegistryService.createRegistry with correct args', async () => {
      await $subject;
      expect(RegistryService.createRegistry).to.have.been.calledWith({
        url: $url,
        isPublic: $isPublic,
        username: $username,
        password: $password,
        email: $email,
        requiresCert: $requiresCert,
        certificate: $certificate
      }, $user);
    });

    context('when RegistryService#createRegistry fails', () => {
      const error = 'Error!';

      def('response', () => Promise.reject(error));

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    });

    context('when RegistryService#createRegistry succeeds', () => {
      it(`succeeds`, () => {
        return expect($subject).to.eventually.equal(undefined)
      })
    })
  });

  describe('.getRegistriesEndPoint()', () => {
    def('user', () => 'user!');

    def('req', () => ({
      body: {}
    }));
    def('response', () => Promise.resolve());
    def('subject', () => $subject.getRegistriesEndPoint($req, $user));

    beforeEach(() => {
      $sandbox.stub(RegistryService, 'findRegistries').returns($response);
    });

    it('calls RegistryService.findRegistries with correct args', async () => {
      await $subject;
      expect(RegistryService.findRegistries).to.have.been.calledWith($user, false)
    });

    context('when RegistryService#findRegistries fails', () => {
      const error = 'Error!';

      def('response', () => Promise.reject(error));

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    });

    context('when RegistryService#findRegistries succeeds', () => {
      it(`succeeds`, () => {
        return expect($subject).to.eventually.equal(undefined)
      })
    })

  });

  describe('.deleteRegistryEndPoint()', () => {
    def('user', () => 'user!');
    def('id', () => 15);

    def('req', () => ({
      params: {
        id: $id
      }
    }));
    def('response', () => Promise.resolve());
    def('subject', () => $subject.deleteRegistryEndPoint($req, $user));

    beforeEach(() => {
      $sandbox.stub(RegistryService, 'deleteRegistry').returns($response);
    });

    it('calls RegistryService.deleteRegistry with correct args', async () => {
      await $subject;
      expect(RegistryService.deleteRegistry).to.have.been.calledWith({
        id: parseInt($req.params.id)
      }, $user, false)
    });

    context('when RegistryService#deleteRegistry fails', () => {
      const error = 'Error!';

      def('response', () => Promise.reject(error));

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    });

    context('when RegistryService#deleteRegistry succeeds', () => {
      it(`succeeds`, () => {
        return expect($subject).to.eventually.equal(undefined)
      })
    })
  });

  describe('.updateRegistryEndPoint()', () => {
    def('user', () => 'user!');
    def('id', () => 15);

    def('url', () => 'updatedUrl');
    def('isPublic', () => false);
    def('username', () => 'updatedUsername');
    def('password', () => 'updatedPassword');
    def('email', () => 'updatedTest@gmail.com');
    def('requiresCert', () => false);
    def('certificate', () => "updatedCertificateString");

    def('req', () => ({
      params: {
        id: $id
      },
      body: {
        url: $url,
        isPublic: $isPublic,
        username: $username,
        password: $password,
        email: $email,
        requiresCert: $requiresCert,
        certificate: $certificate
      }
    }));
    def('response', () => Promise.resolve());
    def('subject', () => $subject.updateRegistryEndPoint($req, $user));

    beforeEach(() => {
      $sandbox.stub(RegistryService, 'updateRegistry').returns($response);
    });

    it('calls RegistryService.updateRegistry with correct args', async () => {
      await $subject;
      expect(RegistryService.updateRegistry).to.have.been.calledWith({
        url: $url,
        isPublic: $isPublic,
        username: $username,
        password: $password,
        email: $email,
        requiresCert: $requiresCert,
        certificate: $certificate
      }, $id, $user, false);
    });

    context('when RegistryService#updateRegistry fails', () => {
      const error = 'Error!';

      def('response', () => Promise.reject(error));

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    });

    context('when RegistryService#updateRegistry succeeds', () => {
      it(`succeeds`, () => {
        return expect($subject).to.eventually.equal(undefined)
      })
    })
  });
});