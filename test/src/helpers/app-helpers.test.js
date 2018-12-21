const crypto = require('crypto');
const { expect } = require('chai');
const fs = require('fs');
const path = require('path');
const portscanner = require('portscanner');
const sinon = require('sinon');

const AppHelpers = require('../../../src/helpers/app-helper');
const Config = require('../../../src/config');

describe('App Helpers', () => {
  const text = 'some-text';
  const salt = 'kosher-salt';
  const encrypted = '18f4faa5c532708c8f';
  const processedSalt = 'c2cd22c1a8133704f09fc8a218088b1b';
  const encryptedPasswordLine = '17f4faa5c532708c8f:18f4faa5c532708c8f';

  def('subject', () => AppHelpers);
  def('sandbox', () => sinon.createSandbox());
  def('cipher', () => ({
    update: $sandbox.stub().returns(''),
    final: $sandbox.stub().returns(encrypted)
  }));
  def('decipher', () => ({
    update: $sandbox.stub().returns(''),
    final: $sandbox.stub().returns(text)
  }));

  afterEach(() => $sandbox.restore());

  describe('.encryptText()', () => {
    def('subject', () => $subject.encryptText(text, salt));
    def('iv', () => '17f4faa5c532708c8f');

    beforeEach(() => {
      $sandbox.stub(crypto, 'randomBytes').returns($iv);
      $sandbox.stub(crypto, 'createCipheriv').returns($cipher);
    });

    it('calls crypto#createCipheriv() with correct args', () => {
      $subject
      expect(crypto.createCipheriv).to.have.been.calledWith('aes-256-ctr', processedSalt, $iv)
    });

    it('calls crypto.cipher#update() with correct args', () => {
      $subject
      expect($cipher.update).to.have.been.calledWith(text, 'utf8', 'hex')
    });

    it('calls crypto.cipher#final() with correct args', () => {
      $subject
      expect($cipher.final).to.have.been.calledWith('hex')
    });

    it('returns the encrypted text', () => {
      expect($subject).to.equal(encryptedPasswordLine)
    })
  });

  describe('.decryptText()', () => {
    def('iv', () => '17f4faa5c532708c8f');
    def('subject', () => $subject.decryptText(encryptedPasswordLine, salt));

    beforeEach(() => {
      $sandbox.stub(crypto, 'createDecipheriv').returns($decipher);
    });

    it('calls crypto.decipher#final() with correct args', () => {
      $subject
      expect($decipher.final).to.have.been.calledWith('utf8')
    });

    it('returns the decrypted text', () => {
      expect($subject).to.equal(text)
    })
  });

  describe('.generateRandomString()', () => {
    def('size', () => 12);

    context('when size is greater than zero', () => {
      it('returns a random string with length of size', () => {
        expect(AppHelpers.generateRandomString($size)).to.have.lengthOf($size)
      })
    });

    context('when size is zero', () => {
      def('size', () => 0)

      it('returns an empty string', () => {
        expect(AppHelpers.generateRandomString($size)).to.have.lengthOf(0)
      })
    })

    context('when size is less than zero', () => {
      def('size', () => 0)

      it('returns an empty string', () => {
        expect(AppHelpers.generateRandomString($size)).to.have.lengthOf(0)
      })
    })
  })

  describe('.checkPortAvailability()', () => {
    const portNumber = 12345
    const portStatus = 'open'

    def('subject', () => $subject.checkPortAvailability(portNumber))

    beforeEach(() => {
      $sandbox.stub(portscanner, 'checkPortStatus').returns(Promise.resolve(portStatus))
    })

    it('calls portscanner#checkPortStatus() with correct args', async () => {
      await $subject
      expect(portscanner.checkPortStatus).to.have.been.calledWith(portNumber)
    })

    it('returns a promise', () => {
      return expect($subject).to.be.an.instanceOf(Promise)
    })

    it('resolves to port status', () => {
      return expect($subject).to.eventually.equal(portStatus)
    })
  })

  describe('.findAvailablePort()', () => {
    const portRangeFrom = 12345
    const portRangeTo = 12350
    const availablePort = 12346
    const hostName = 'hostname'

    def('subject', () => $subject.findAvailablePort(hostName))

    beforeEach(() => {
      $sandbox.stub(Config, 'get')
        .withArgs('Tunnel:PortRange')
        .returns(`${portRangeFrom}-${portRangeTo}`)

      $sandbox.stub(portscanner, 'findAPortNotInUse').returns(Promise.resolve(availablePort))
    })

    it('calls portscanner#findAPortNotInUse() with correct args', async () => {
      await $subject
      expect(portscanner.findAPortNotInUse).to.have.been.calledWith(portRangeFrom, portRangeTo, hostName)
    })

    it('returns a promise', () => {
      return expect($subject).to.be.an.instanceOf(Promise)
    })

    it('returns the first available port', () => {
      return expect($subject).to.eventually.equal(availablePort)
    })
  })

  describe('.isFileExists()', () => {
    def('file', () => 'test.tmp')
    def('extName', () => '.tmp')
    def('exists', () => true)
    def('subject', () => $subject.isFileExists($file))

    beforeEach(() => {
      $sandbox.stub(path, 'extname').returns($extName)
      $sandbox.stub(fs, 'existsSync').returns($exists)
    })

    context('when does not have extension', () => {
      def('extName', () => 'test')

      it('returns false', () => {
        expect($subject).to.be.false
      })
    })

    context('when has extension', () => {
      context('when file does not exist', () => {
        def('exists', () => false)

        it('returns false', () => {
          expect($subject).to.be.false
        })
      })

      context('when file does not exist', () => {
        it('returns true', () => {
          expect($subject).to.be.true
        })
      })
    })
  })

  describe('.isValidPort()', () => {
    def('port', () => 12345)
    def('subject', () => $subject.isValidPort($port))

    const testPort = (text, string) => {
      context(`when the ${text} is not an integer`, () => {
        def('port', () => string ? '12345.5' : 12345.5)

        it('returns false', () => {
          expect($subject).to.be.false
        })
      })

      context(`when the ${text} is an integer`, () => {
        context(`when the ${text} is less than 0`, () => {
          def('port', () => string ? '-1' : -1)

          it('returns false', () => {
            expect($subject).to.be.false
          })
        })

        context(`when the ${text} is greater than 65534`, () => {
          def('port', () => string ? '65535' : 65535)

          it('returns false', () => {
            expect($subject).to.be.false
          })
        })

        context(`when the ${text} is valid`, () => {
          def('port', () => string ? '12345' : 12345)

          it('returns false', () => {
            expect($subject).to.be.true
          })
        })
      })
    }

    context('when provided value is a number', () => {
      testPort('number', false)
    })

    context('when provided value is a string', () => {
      context('when the string is not numeric', () => {
        def('port', () => 'some-text')

        it('returns false', () => {
          expect($subject).to.be.false
        })
      })

      context('when the string is numeric', () => {
        testPort('numeric string', true)
      })
    })
  })

  describe('.isValidDomain()', () => {
    def('domain', () => 'www.domain.com')
    def('subject', () => $subject.isValidDomain($domain))

    context('when provided value is null', () => {
      def('domain', () => null)

      it('returns false', () => {
        expect($subject).to.be.false
      })
    })

    context('when provided value is not null', () => {
      context('when domain is valid', () => {
        it('returns true', () => {
          expect($subject).to.be.true
        })
      })

      context('when domain is not valid', () => {
        def('domain', () => 'invalid-domain')

        it('returns false', () => {
          expect($subject).to.be.false
        })
      })
    })
  })

  // TODO:
  // generateAccessToken
  // checkTransaction
  // deleteUndefinedFields
  // validateBooleanCliOptions
  // formatMessage
  // stringifyCliJsonSchema
  // handleCLIError
  // trimCertificate
  // validateParameters
  // _validateArg
  // _getPossibleAliasesList
  // _getPossibleArgsList
  // isTest

})
