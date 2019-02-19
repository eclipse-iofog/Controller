const {expect} = require('chai')
const sinon = require('sinon')

const DiagnosticController = require('../../../src/controllers/diagnostic-controller')
const DiagnosticService = require('../../../src/services/diagnostic-service')

describe('Diagnostic Controller', () => {
  def('subject', () => DiagnosticController)
  def('sandbox', () => sinon.createSandbox())

  afterEach(() => $sandbox.restore())

  describe('.changeMicroserviceStraceStateEndPoint()', () => {
    def('user', () => 'user!')
    def('uuid', () => 'testUuid')

    def('enable', () => true)

    def('req', () => ({
      params: {
        uuid: $uuid,
      },
      body: {
        enable: $enable,
      },
    }))

    def('response', () => Promise.resolve())
    def('subject', () => $subject.changeMicroserviceStraceStateEndPoint($req, $user))

    beforeEach(() => {
      $sandbox.stub(DiagnosticService, 'changeMicroserviceStraceState').returns($response)
    })

    it('calls DiagnosticService.changeMicroserviceStraceState with correct args', async () => {
      await $subject
      expect(DiagnosticService.changeMicroserviceStraceState).to.have.been.calledWith($uuid, {
        enable: $enable,
      }, $user, false)
    })

    context('when DiagnosticService#changeMicroserviceStraceState fails', () => {
      const error = 'Error!'

      def('response', () => Promise.reject(error))

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when DiagnosticService#changeMicroserviceStraceState succeeds', () => {
      it(`succeeds`, () => {
        return expect($subject).to.eventually.equal(undefined)
      })
    })
  })

  describe('.getMicroserviceStraceDataEndPoint()', () => {
    def('user', () => 'user!')
    def('uuid', () => 'testUuid')
    def('format', () => 'string')

    def('req', () => ({
      params: {
        uuid: $uuid,
      },
      query: {
        format: $format,
      },
    }))
    def('response', () => Promise.resolve())
    def('subject', () => $subject.getMicroserviceStraceDataEndPoint($req, $user))

    beforeEach(() => {
      $sandbox.stub(DiagnosticService, 'getMicroserviceStraceData').returns($response)
    })

    it('calls DiagnosticService.getMicroserviceStraceData with correct args', async () => {
      await $subject
      expect(DiagnosticService.getMicroserviceStraceData).to.have.been.calledWith($uuid, {
        format: $format,
      }, $user, false)
    })

    context('when DiagnosticService#getMicroserviceStraceData fails', () => {
      const error = 'Error!'

      def('response', () => Promise.reject(error))

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when DiagnosticService#getMicroserviceStraceData succeeds', () => {
      it(`succeeds`, () => {
        return expect($subject).to.eventually.equal(undefined)
      })
    })
  })

  describe('.postMicroserviceStraceDataToFtpEndPoint()', () => {
    def('user', () => 'user!')
    def('uuid', () => 'testUuid')

    def('ftpHost', () => 'testHost')
    def('ftpPort', () => 15)
    def('ftpPass', () => 'ftpPass')
    def('ftpDestDir', () => 'ftpDestDirectory')

    def('req', () => ({
      params: {
        uuid: $uuid,
      },
      body: {
        ftpHost: $ftpHost,
        ftpPort: $ftpPort,
        ftpPass: $ftpPass,
        ftpDestDir: $ftpDestDir,
      },
    }))

    def('response', () => Promise.resolve())
    def('subject', () => $subject.postMicroserviceStraceDataToFtpEndPoint($req, $user))

    beforeEach(() => {
      $sandbox.stub(DiagnosticService, 'postMicroserviceStraceDatatoFtp').returns($response)
    })

    it('calls DiagnosticService.postMicroserviceStraceDatatoFtp with correct args', async () => {
      await $subject
      expect(DiagnosticService.postMicroserviceStraceDatatoFtp).to.have.been.calledWith($uuid, {
        ftpHost: $ftpHost,
        ftpPort: $ftpPort,
        ftpPass: $ftpPass,
        ftpDestDir: $ftpDestDir,
      }, $user, false)
    })

    context('when DiagnosticService#postMicroserviceStraceDatatoFtp fails', () => {
      const error = 'Error!'

      def('response', () => Promise.reject(error))

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when DiagnosticService#postMicroserviceStraceDatatoFtp succeeds', () => {
      it(`succeeds`, () => {
        return expect($subject).to.eventually.equal(undefined)
      })
    })
  })

  describe('.createMicroserviceImageSnapshotEndPoint()', () => {
    def('user', () => 'user!')
    def('uuid', () => 'testUuid')

    def('req', () => ({
      params: {
        uuid: $uuid,
      },
    }))

    def('response', () => Promise.resolve())
    def('subject', () => $subject.createMicroserviceImageSnapshotEndPoint($req, $user))

    beforeEach(() => {
      $sandbox.stub(DiagnosticService, 'postMicroserviceImageSnapshotCreate').returns($response)
    })

    it('calls DiagnosticService.postMicroserviceImageSnapshotCreate with correct args', async () => {
      await $subject
      expect(DiagnosticService.postMicroserviceImageSnapshotCreate).to.have.been.calledWith($uuid, $user, false)
    })

    context('when DiagnosticService#postMicroserviceImageSnapshotCreate fails', () => {
      const error = 'Error!'

      def('response', () => Promise.reject(error))

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when DiagnosticService#postMicroserviceImageSnapshotCreate succeeds', () => {
      it(`succeeds`, () => {
        return expect($subject).to.eventually.equal(undefined)
      })
    })
  })

  describe('.getMicroserviceImageSnapshotEndPoint()', () => {
    def('user', () => 'user!')
    def('uuid', () => 'testUuid')

    def('req', () => ({
      params: {
        uuid: $uuid,
      },
    }))

    def('response', () => Promise.resolve())
    def('subject', () => $subject.getMicroserviceImageSnapshotEndPoint($req, $user))

    beforeEach(() => {
      $sandbox.stub(DiagnosticService, 'getMicroserviceImageSnapshot').returns($response)
    })

    it('calls DiagnosticService.getMicroserviceImageSnapshot with correct args', async () => {
      await $subject
      expect(DiagnosticService.getMicroserviceImageSnapshot).to.have.been.calledWith($uuid, $user, false)
    })

    context('when DiagnosticService.getMicroserviceImageSnapshot fails', () => {
      const error = 'Error!'

      def('response', () => Promise.reject(error))

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when DiagnosticService.getMicroserviceImageSnapshot succeeds', () => {
      it(`succeeds`, () => {
        return expect($subject).to.eventually.equal(undefined)
      })
    })
  })
})
