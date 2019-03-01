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
      $sandbox.stub(ioFogService, 'createFog').returns($response)
    })

    it('calls ioFogService.createFog with correct args', async () => {
      await $subject
      expect(ioFogService.createFog).to.have.been.calledWith({
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

    context('when ioFogService#createFog fails', () => {
      const error = 'Error!'

      def('response', () => Promise.reject(error))

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when ioFogService#createFog succeeds', () => {
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
      $sandbox.stub(ioFogService, 'updateFog').returns($response)
    })

    it('calls ioFogService.updateFog with correct args', async () => {
      await $subject
      expect(ioFogService.updateFog).to.have.been.calledWith({
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

    context('when ioFogService#updateFog fails', () => {
      const error = 'Error!'

      def('response', () => Promise.reject(error))

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when ioFogService#updateFog succeeds', () => {
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
      $sandbox.stub(ioFogService, 'deleteFog').returns($response)
    })

    it('calls ioFogService.deleteFog with correct args', async () => {
      await $subject
      expect(ioFogService.deleteFog).to.have.been.calledWith({uuid: $uuid}, $user, false)
    })

    context('when ioFogService#deleteFog fails', () => {
      const error = 'Error!'

      def('response', () => Promise.reject(error))

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when ioFogService#deleteFog succeeds', () => {
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
      $sandbox.stub(ioFogService, 'getFogWithTransaction').returns($response)
    })

    it('calls ioFogService.getFogWithTransaction with correct args', async () => {
      await $subject
      expect(ioFogService.getFogWithTransaction).to.have.been.calledWith({uuid: $uuid}, $user, false)
    })

    context('when ioFogService#getFogWithTransaction fails', () => {
      const error = 'Error!'

      def('response', () => Promise.reject(error))

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when ioFogService#getFogWithTransaction succeeds', () => {
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
      $sandbox.stub(ioFogService, 'getFogList').returns($response)
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
      it('calls ioFogService.getFogList with correct args', async () => {
        await $subject
        expect(ioFogService.getFogList).to.have.been.calledWith($filters, $user, false)
      })

      context('when ioFogService.getFogList fails', () => {
        const error = 'Error!'

        def('response', () => Promise.reject(error))

        it(`fails with "${error}"`, () => {
          return expect($subject).to.be.rejectedWith(error)
        })
      })

      context('when ioFogService.getFogList succeeds', () => {
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
      $sandbox.stub(ioFogService, 'generateProvisioningKey').returns($response)
    })

    it('calls ioFogService.generateProvisioningKey with correct args', async () => {
      await $subject
      expect(ioFogService.generateProvisioningKey).to.have.been.calledWith({uuid: $uuid}, $user, false)
    })

    context('when ioFogService#generateProvisioningKey fails', () => {
      const error = 'Error!'

      def('response', () => Promise.reject(error))

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when ioFogService#generateProvisioningKey succeeds', () => {
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
      $sandbox.stub(ioFogService, 'setFogVersionCommand').returns($response)
    })

    it('calls ioFogService.setFogVersionCommand with correct args', async () => {
      await $subject
      expect(ioFogService.setFogVersionCommand).to.have.been.calledWith({
        uuid: $uuid,
        versionCommand: $versionCommand,
      }, $user, false)
    })

    context('when ioFogService#setFogVersionCommand fails', () => {
      const error = 'Error!'

      def('response', () => Promise.reject(error))

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when ioFogService#setFogVersionCommand succeeds', () => {
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
      $sandbox.stub(ioFogService, 'setFogRebootCommand').returns($response)
    })

    it('calls ioFogService.setFogRebootCommand with correct args', async () => {
      await $subject
      expect(ioFogService.setFogRebootCommand).to.have.been.calledWith({uuid: $uuid}, $user, false)
    })

    context('when ioFogService#setFogRebootCommand fails', () => {
      const error = 'Error!'

      def('response', () => Promise.reject(error))

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when ioFogService#setFogRebootCommand succeeds', () => {
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
      $sandbox.stub(ioFogService, 'getHalHardwareInfo').returns($response)
    })

    it('calls ioFogService.getHalHardwareInfo with correct args', async () => {
      await $subject
      expect(ioFogService.getHalHardwareInfo).to.have.been.calledWith({uuid: $uuid}, $user, false)
    })

    context('when ioFogService#getHalHardwareInfo fails', () => {
      const error = 'Error!'

      def('response', () => Promise.reject(error))

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when ioFogService#getHalHardwareInfo succeeds', () => {
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
      $sandbox.stub(ioFogService, 'getHalUsbInfo').returns($response)
    })

    it('calls ioFogService.getHalUsbInfo with correct args', async () => {
      await $subject
      expect(ioFogService.getHalUsbInfo).to.have.been.calledWith({uuid: $uuid}, $user, false)
    })

    context('when ioFogService#getHalUsbInfo fails', () => {
      const error = 'Error!'

      def('response', () => Promise.reject(error))

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when ioFogService#getHalUsbInfo succeeds', () => {
      it(`succeeds`, () => {
        return expect($subject).to.eventually.have.property('info')
      })
    })
  })
})
