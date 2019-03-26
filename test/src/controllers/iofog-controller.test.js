const {expect} = require('chai')
const sinon = require('sinon')

const ioFogController = require('../../../src/controllers/iofog-controller')
const ioFogService = require('../../../src/services/iofog-service')
const qs = require('qs')


describe('ioFog Controller', () => {
  def('subject', () => ioFogController)
  def('sandbox', () => sinon.createSandbox())

  afterEach(() => $sandbox.restore())

  describe('.createFogEndPoint()', () => {
    def('user', () => 'user!')

    def('name', () => 'testName')
    def('location', () => 'testLocation')
    def('latitude', () => 15)
    def('longitude', () => 16)
    def('description', () => 'testDescription')
    def('dockerUrl', () => 'testDockerUrl')
    def('diskLimit', () => 25)
    def('diskDirectory', () => 'testDiskDirectory')
    def('memoryLimit', () => 35)
    def('cpuLimit', () => 45)
    def('logLimit', () => 15)
    def('logDirectory', () => 'testLogDirectory')
    def('logFileCount', () => 8)
    def('statusFrequency', 6)
    def('changeFrequency', 18)
    def('deviceScanFrequency', 28)
    def('bluetoothEnabled', () => false)
    def('watchdogEnabled', () => true)
    def('abstractedHardwareEnabled', () => false)
    def('fogType', () => 0)

    def('req', () => ({
      body: {
        name: $name,
        location: $location,
        latitude: $latitude,
        longitude: $longitude,
        description: $description,
        dockerUrl: $dockerUrl,
        diskLimit: $diskLimit,
        diskDirectory: $diskDirectory,
        memoryLimit: $memoryLimit,
        cpuLimit: $cpuLimit,
        logLimit: $logLimit,
        logDirectory: $logDirectory,
        logFileCount: $logFileCount,
        statusFrequency: $statusFrequency,
        changeFrequency: $changeFrequency,
        deviceScanFrequency: $deviceScanFrequency,
        bluetoothEnabled: $bluetoothEnabled,
        watchdogEnabled: $watchdogEnabled,
        abstractedHardwareEnabled: $abstractedHardwareEnabled,
        fogType: $fogType,
      },
    }))

    def('response', () => Promise.resolve())
    def('subject', () => $subject.createFogEndPoint($req, $user))

    beforeEach(() => {
      $sandbox.stub(ioFogService, 'createFogEndPoint').returns($response)
    })

    it('calls ioFogService.createFogEndPoint with correct args', async () => {
      await $subject
      expect(ioFogService.createFogEndPoint).to.have.been.calledWith({
        name: $name,
        location: $location,
        latitude: $latitude,
        longitude: $longitude,
        description: $description,
        dockerUrl: $dockerUrl,
        diskLimit: $diskLimit,
        diskDirectory: $diskDirectory,
        memoryLimit: $memoryLimit,
        cpuLimit: $cpuLimit,
        logLimit: $logLimit,
        logDirectory: $logDirectory,
        logFileCount: $logFileCount,
        statusFrequency: $statusFrequency,
        changeFrequency: $changeFrequency,
        deviceScanFrequency: $deviceScanFrequency,
        bluetoothEnabled: $bluetoothEnabled,
        watchdogEnabled: $watchdogEnabled,
        abstractedHardwareEnabled: $abstractedHardwareEnabled,
        fogType: $fogType,
      }, $user, false)
    })

    context('when ioFogService#createFogEndPoint fails', () => {
      const error = 'Error!'

      def('response', () => Promise.reject(error))

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when ioFogService#createFogEndPoint succeeds', () => {
      it(`succeeds`, () => {
        return expect($subject).to.eventually.equal(undefined)
      })
    })
  })

  describe('.updateFogEndPoint()', () => {
    def('user', () => 'user!')
    def('uuid', () => 'testUuid')

    def('name', () => 'testName')
    def('location', () => 'testLocation')
    def('latitude', () => 15)
    def('longitude', () => 16)
    def('description', () => 'testDescription')
    def('dockerUrl', () => 'testDockerUrl')
    def('diskLimit', () => 25)
    def('diskDirectory', () => 'testDiskDirectory')
    def('memoryLimit', () => 35)
    def('cpuLimit', () => 45)
    def('logLimit', () => 15)
    def('logDirectory', () => 'testLogDirectory')
    def('logFileCount', () => 8)
    def('statusFrequency', 6)
    def('changeFrequency', 18)
    def('deviceScanFrequency', 28)
    def('bluetoothEnabled', () => false)
    def('watchdogEnabled', () => true)
    def('abstractedHardwareEnabled', () => false)
    def('fogType', () => 0)

    def('req', () => ({
      params: {
        uuid: $uuid,
      },
      body: {
        name: $name,
        location: $location,
        latitude: $latitude,
        longitude: $longitude,
        description: $description,
        dockerUrl: $dockerUrl,
        diskLimit: $diskLimit,
        diskDirectory: $diskDirectory,
        memoryLimit: $memoryLimit,
        cpuLimit: $cpuLimit,
        logLimit: $logLimit,
        logDirectory: $logDirectory,
        logFileCount: $logFileCount,
        statusFrequency: $statusFrequency,
        changeFrequency: $changeFrequency,
        deviceScanFrequency: $deviceScanFrequency,
        bluetoothEnabled: $bluetoothEnabled,
        watchdogEnabled: $watchdogEnabled,
        abstractedHardwareEnabled: $abstractedHardwareEnabled,
        fogType: $fogType,
      },
    }))
    def('response', () => Promise.resolve())
    def('subject', () => $subject.updateFogEndPoint($req, $user))

    beforeEach(() => {
      $sandbox.stub(ioFogService, 'updateFogEndPoint').returns($response)
    })

    it('calls ioFogService.updateFogEndPoint with correct args', async () => {
      await $subject
      expect(ioFogService.updateFogEndPoint).to.have.been.calledWith({
        uuid: $uuid,
        name: $name,
        location: $location,
        latitude: $latitude,
        longitude: $longitude,
        description: $description,
        dockerUrl: $dockerUrl,
        diskLimit: $diskLimit,
        diskDirectory: $diskDirectory,
        memoryLimit: $memoryLimit,
        cpuLimit: $cpuLimit,
        logLimit: $logLimit,
        logDirectory: $logDirectory,
        logFileCount: $logFileCount,
        statusFrequency: $statusFrequency,
        changeFrequency: $changeFrequency,
        deviceScanFrequency: $deviceScanFrequency,
        bluetoothEnabled: $bluetoothEnabled,
        watchdogEnabled: $watchdogEnabled,
        abstractedHardwareEnabled: $abstractedHardwareEnabled,
        fogType: $fogType,
      }, $user, false)
    })

    context('when ioFogService#updateFogEndPoint fails', () => {
      const error = 'Error!'

      def('response', () => Promise.reject(error))

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when ioFogService#updateFogEndPoint succeeds', () => {
      it(`succeeds`, () => {
        return expect($subject).to.eventually.equal(undefined)
      })
    })
  })

  describe('.deleteFogEndPoint()', () => {
    def('user', () => 'user!')
    def('uuid', () => 'newTestUuid')

    def('req', () => ({
      params: {
        uuid: $uuid,
      },
    }))

    def('response', () => Promise.resolve())
    def('subject', () => $subject.deleteFogEndPoint($req, $user))

    beforeEach(() => {
      $sandbox.stub(ioFogService, 'deleteFogEndPoint').returns($response)
    })

    it('calls ioFogService.deleteFogEndPoint with correct args', async () => {
      await $subject
      expect(ioFogService.deleteFogEndPoint).to.have.been.calledWith({uuid: $uuid}, $user, false)
    })

    context('when ioFogService#deleteFogEndPoint fails', () => {
      const error = 'Error!'

      def('response', () => Promise.reject(error))

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when ioFogService#deleteFogEndPoint succeeds', () => {
      it(`succeeds`, () => {
        return expect($subject).to.eventually.equal(undefined)
      })
    })
  })

  describe('.getFogEndPoint()', () => {
    def('user', () => 'user!')
    def('uuid', () => 'testUuid')

    def('req', () => ({
      params: {
        uuid: $uuid,
      },
    }))
    def('response', () => Promise.resolve())
    def('subject', () => $subject.getFogEndPoint($req, $user))

    beforeEach(() => {
      $sandbox.stub(ioFogService, 'getFogEndPoint').returns($response)
    })

    it('calls ioFogService.getFogEndPoint with correct args', async () => {
      await $subject
      expect(ioFogService.getFogEndPoint).to.have.been.calledWith({uuid: $uuid}, $user, false)
    })

    context('when ioFogService#getFogEndPoint fails', () => {
      const error = 'Error!'

      def('response', () => Promise.reject(error))

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when ioFogService#getFogEndPoint succeeds', () => {
      it(`succeeds`, () => {
        return expect($subject).to.eventually.equal(undefined)
      })
    })
  })

  describe('.getFogListEndPoint()', () => {
    def('user', () => 'user!')
    def('filters', () => 'filtersQuery')

    def('req', () => ({
      query: {
        filters: $filters,
      },
    }))
    def('response', () => Promise.resolve())
    def('queryParseResponse', () => ({
      filters: $filters,
    }))
    def('subject', () => $subject.getFogListEndPoint($req, $user))

    beforeEach(() => {
      $sandbox.stub(qs, 'parse').returns($queryParseResponse)
      $sandbox.stub(ioFogService, 'getFogListEndPoint').returns($response)
    })

    it('calls qs.parse with correct args', async () => {
      await $subject
      expect(qs.parse).to.have.been.calledWith($queryParseResponse)
    })

    context('when qs.parse fails', () => {
      const error = 'Error!'

      def('response', () => Promise.reject(error))

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when qs.parse succeeds', () => {
      it('calls ioFogService.getFogListEndPoint with correct args', async () => {
        await $subject
        expect(ioFogService.getFogListEndPoint).to.have.been.calledWith($filters, $user, false)
      })

      context('when ioFogService.getFogListEndPoint fails', () => {
        const error = 'Error!'

        def('response', () => Promise.reject(error))

        it(`fails with "${error}"`, () => {
          return expect($subject).to.be.rejectedWith(error)
        })
      })

      context('when ioFogService.getFogListEndPoint succeeds', () => {
        it(`succeeds`, () => {
          return expect($subject).to.eventually.equal(undefined)
        })
      })
    })
  })

  describe('.generateProvisionKeyEndPoint()', () => {
    def('user', () => 'user!')
    def('uuid', () => 'testUuid')

    def('req', () => ({
      params: {
        uuid: $uuid,
      },
    }))
    def('response', () => Promise.resolve())
    def('subject', () => $subject.generateProvisioningKeyEndPoint($req, $user))

    beforeEach(() => {
      $sandbox.stub(ioFogService, 'generateProvisioningKeyEndPoint').returns($response)
    })

    it('calls ioFogService.generateProvisioningKeyEndPoint with correct args', async () => {
      await $subject
      expect(ioFogService.generateProvisioningKeyEndPoint).to.have.been.calledWith({uuid: $uuid}, $user, false)
    })

    context('when ioFogService#generateProvisioningKeyEndPoint fails', () => {
      const error = 'Error!'

      def('response', () => Promise.reject(error))

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when ioFogService#generateProvisioningKeyEndPoint succeeds', () => {
      it(`succeeds`, () => {
        return expect($subject).to.eventually.equal(undefined)
      })
    })
  })

  describe('setFogVersionCommandEndPoint()', () => {
    def('user', () => 'user!')
    def('uuid', () => 'testUuid')
    def('versionCommand', () => 'version')

    def('req', () => ({
      params: {
        uuid: $uuid,
        versionCommand: $versionCommand,
      },
    }))
    def('response', () => Promise.resolve())
    def('subject', () => $subject.setFogVersionCommandEndPoint($req, $user))

    beforeEach(() => {
      $sandbox.stub(ioFogService, 'setFogVersionCommandEndPoint').returns($response)
    })

    it('calls ioFogService.setFogVersionCommandEndPoint with correct args', async () => {
      await $subject
      expect(ioFogService.setFogVersionCommandEndPoint).to.have.been.calledWith({
        uuid: $uuid,
        versionCommand: $versionCommand,
      }, $user, false)
    })

    context('when ioFogService#setFogVersionCommandEndPoint fails', () => {
      const error = 'Error!'

      def('response', () => Promise.reject(error))

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when ioFogService#setFogVersionCommandEndPoint succeeds', () => {
      it(`succeeds`, () => {
        return expect($subject).to.eventually.equal(undefined)
      })
    })
  })

  describe('setFogRebootCommandEndPoint()', () => {
    def('user', () => 'user!')
    def('uuid', () => 'testUuid')

    def('req', () => ({
      params: {
        uuid: $uuid,
      },
    }))
    def('response', () => Promise.resolve())
    def('subject', () => $subject.setFogRebootCommandEndPoint($req, $user))

    beforeEach(() => {
      $sandbox.stub(ioFogService, 'setFogRebootCommandEndPoint').returns($response)
    })

    it('calls ioFogService.setFogRebootCommandEndPoint with correct args', async () => {
      await $subject
      expect(ioFogService.setFogRebootCommandEndPoint).to.have.been.calledWith({uuid: $uuid}, $user, false)
    })

    context('when ioFogService#setFogRebootCommandEndPoint fails', () => {
      const error = 'Error!'

      def('response', () => Promise.reject(error))

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when ioFogService#setFogRebootCommandEndPoint succeeds', () => {
      it(`succeeds`, () => {
        return expect($subject).to.eventually.equal(undefined)
      })
    })
  })

  describe('getHalHardwareInfoEndPoint()', () => {
    def('user', () => 'user!')
    def('uuid', () => 'testUuid')

    def('req', () => ({
      params: {
        uuid: $uuid,
      },
    }))
    def('response', () => Promise.resolve())
    def('subject', () => $subject.getHalHardwareInfoEndPoint($req, $user))

    beforeEach(() => {
      $sandbox.stub(ioFogService, 'getHalHardwareInfoEndPoint').returns($response)
    })

    it('calls ioFogService.getHalHardwareInfoEndPoint with correct args', async () => {
      await $subject
      expect(ioFogService.getHalHardwareInfoEndPoint).to.have.been.calledWith({uuid: $uuid}, $user, false)
    })

    context('when ioFogService#getHalHardwareInfoEndPoint fails', () => {
      const error = 'Error!'

      def('response', () => Promise.reject(error))

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when ioFogService#getHalHardwareInfoEndPoint succeeds', () => {
      it(`succeeds`, () => {
        return expect($subject).to.eventually.equal(undefined)
      })
    })
  })

  describe('getHalUsbInfoEndPoint.()', () => {
    def('user', () => 'user!')
    def('uuid', () => 'testUuid')

    def('req', () => ({
      params: {
        uuid: $uuid,
      },
    }))
    def('response', () => Promise.resolve({info: undefined}))
    def('subject', () => $subject.getHalUsbInfoEndPoint($req, $user))

    beforeEach(() => {
      $sandbox.stub(ioFogService, 'getHalUsbInfoEndPoint').returns($response)
    })

    it('calls ioFogService.getHalUsbInfoEndPoint with correct args', async () => {
      await $subject
      expect(ioFogService.getHalUsbInfoEndPoint).to.have.been.calledWith({uuid: $uuid}, $user, false)
    })

    context('when ioFogService#getHalUsbInfoEndPoint fails', () => {
      const error = 'Error!'

      def('response', () => Promise.reject(error))

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when ioFogService#getHalUsbInfoEndPoint succeeds', () => {
      it(`succeeds`, () => {
        return expect($subject).to.eventually.have.property('info')
      })
    })
  })
})
