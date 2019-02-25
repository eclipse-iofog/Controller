const {expect} = require('chai')
const sinon = require('sinon')

const AgentController = require('../../../src/controllers/agent-controller')
const AgentService = require('../../../src/services/agent-service')

describe('Agent Controller', () => {
  def('subject', () => AgentController)
  def('sandbox', () => sinon.createSandbox())

  afterEach(() => $sandbox.restore())

  describe('.agentProvisionEndPoint()', () => {
    def('type', () => 1)
    def('key', () => 'testKey')

    def('req', () => ({
      body: {
        type: $type,
        key: $key,
      },
    }))

    def('response', () => Promise.resolve())
    def('subject', () => $subject.agentProvisionEndPoint($req))

    beforeEach(() => {
      $sandbox.stub(AgentService, 'agentProvision').returns($response)
    })

    it('calls AgentService.agentProvision with correct args', async () => {
      await $subject
      expect(AgentService.agentProvision).to.have.been.calledWith({
        type: $type,
        key: $key,
      })
    })

    context('when AgentService#agentProvision fails', () => {
      const error = 'Error!'

      def('response', () => Promise.reject(error))

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when AgentService#agentProvision succeeds', () => {
      it(`succeeds`, () => {
        return expect($subject).to.eventually.equal(undefined)
      })
    })
  })

  describe('.agentDeprovisionEndPoint()', () => {
    def('fog', () => 'fog!')
    const deprovisionData = {microserviceUuids: ['uuid']}

    def('req', () => ({
      body: deprovisionData,
    }))

    def('response', () => Promise.resolve())
    def('subject', () => $subject.agentDeprovisionEndPoint($req, $fog))

    beforeEach(() => {
      $sandbox.stub(AgentService, 'agentDeprovision').returns($response)
    })

    it('calls AgentService.agentDeprovision with correct args', async () => {
      await $subject
      expect(AgentService.agentDeprovision).to.have.been.calledWith(deprovisionData, $fog)
    })

    context('when AgentService#agentDeprovision fails', () => {
      const error = 'Error!'

      def('response', () => Promise.reject(error))

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when AgentService#agentDeprovision succeeds', () => {
      it(`succeeds`, () => {
        return expect($subject).to.eventually.equal(undefined)
      })
    })
  })

  describe('.getAgentConfigEndPoint()', () => {
    def('fog', () => 'fog!')

    def('req', () => ({
      body: {},
    }))
    def('response', () => Promise.resolve())
    def('subject', () => $subject.getAgentConfigEndPoint($req, $fog))

    beforeEach(() => {
      $sandbox.stub(AgentService, 'getAgentConfig').returns($response)
    })

    it('calls AgentService.getAgentConfig with correct args', async () => {
      await $subject
      expect(AgentService.getAgentConfig).to.have.been.calledWith($fog)
    })

    context('when AgentService#getAgentConfig fails', () => {
      const error = 'Error!'

      def('response', () => Promise.reject(error))

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when AgentService#getAgentConfig succeeds', () => {
      it(`succeeds`, () => {
        return expect($subject).to.eventually.equal(undefined)
      })
    })
  })

  describe('.updateAgentConfigEndPoint()', () => {
    def('fog', () => 'fog!')

    def('networkInterface', () => 'testNetworkInterface')
    def('dockerUrl', () => 'testDockerUrl')
    def('diskLimit', 15)
    def('diskDirectory', () => 'testDiskDirectory')
    def('memoryLimit', () => 25)
    def('cpuLimit', () => 35)
    def('logLimit', () => 45)
    def('logDirectory', () => 'testLogDirectory')
    def('logFileCount', () => 5)
    def('statusFrequency', () => 60)
    def('changeFrequency', () => 30)
    def('deviceScanFrequency', () => 40)
    def('watchdogEnabled', () => true)
    def('latitude', () => 30)
    def('longitude', () => 40)
    def('gpsMode', () => 'testGpsMode')

    def('req', () => ({
      body: {
        networkInterface: $networkInterface,
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
        devicesScanFrequency: $deviceScanFrequency,
        watchdogEnabled: $watchdogEnabled,
        latitude: $latitude,
        longitude: $longitude,
        gpsMode: $gpsMode,
      },
    }))

    def('response', () => Promise.resolve())
    def('subject', () => $subject.updateAgentConfigEndPoint($req, $fog))

    beforeEach(() => {
      $sandbox.stub(AgentService, 'updateAgentConfig').returns($response)
    })

    it('calls AgentService.updateAgentConfig with correct args', async () => {
      await $subject
      expect(AgentService.updateAgentConfig).to.have.been.calledWith({
        networkInterface: $networkInterface,
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
        devicesScanFrequency: $deviceScanFrequency,
        watchdogEnabled: $watchdogEnabled,
        latitude: $latitude,
        longitude: $longitude,
        gpsMode: $gpsMode,
      }, $fog)
    })

    context('when AgentService#updateAgentConfig fails', () => {
      const error = 'Error!'

      def('response', () => Promise.reject(error))

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when AgentService#updateAgentConfig succeeds', () => {
      it(`succeeds`, () => {
        return expect($subject).to.eventually.equal(undefined)
      })
    })
  })

  describe('.getAgentConfigChangesEndPoint()', () => {
    def('fog', () => 'fog!')

    def('req', () => ({
      body: {},
    }))
    def('response', () => Promise.resolve())
    def('subject', () => $subject.getAgentConfigChangesEndPoint($req, $fog))

    beforeEach(() => {
      $sandbox.stub(AgentService, 'getAgentConfigChanges').returns($response)
    })

    it('calls AgentService.getAgentConfigChanges with correct args', async () => {
      await $subject
      expect(AgentService.getAgentConfigChanges).to.have.been.calledWith($fog)
    })

    context('when AgentService#getAgentConfigChanges fails', () => {
      const error = 'Error!'

      def('response', () => Promise.reject(error))

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when AgentService#getAgentConfigChanges succeeds', () => {
      it(`succeeds`, () => {
        return expect($subject).to.eventually.equal(undefined)
      })
    })
  })

  describe('.updateAgentStatusEndPoint()', () => {
    def('fog', () => 'fog!')

    def('daemonStatus', () => 'testDaemonStatus')
    def('daemonOperatingDuration', () => 'testDaemonOperatingDuration')
    def('daemonLastStart', () => 5)
    def('memoryUsage', () => 25)
    def('diskUsage', () => 35)
    def('cpuUsage', () => 45)
    def('memoryViolation', () => true)
    def('diskViolation', () => true)
    def('cpuViolation', () => true)
    def('microserviceStatus', () => 'RUNNING')
    def('repositoryCount', () => 5)
    def('repositoryStatus', () => 'testRepositoryStatus')
    def('systemTime', () => 1555555)
    def('lastStatusTime', () => 15555555)
    def('ipAddress', () => 'testIpAddress')
    def('processedMessages', () => 155)
    def('microserviceMessageCounts', () => 1555)
    def('messageSpeed', () => 5)
    def('lastCommandTime', () => 155555555)
    def('tunnelStatus', () => 'testTunnelStatus')
    def('version', () => '1.5.6')
    def('isReadyToUpgrade', () => true)
    def('isReadyToRollback', () => true)

    def('req', () => ({
      body: {
        daemonStatus: $daemonStatus,
        daemonOperatingDuration: $daemonOperatingDuration,
        daemonLastStart: $daemonLastStart,
        memoryUsage: $memoryUsage,
        diskUsage: $diskUsage,
        cpuUsage: $cpuUsage,
        memoryViolation: $memoryViolation,
        diskViolation: $diskViolation,
        cpuViolation: $cpuViolation,
        microserviceStatus: $microserviceStatus,
        repositoryCount: $repositoryCount,
        repositoryStatus: $repositoryStatus,
        systemTime: $systemTime,
        lastStatusTime: $lastStatusTime,
        ipAddress: $ipAddress,
        processedMessages: $processedMessages,
        microserviceMessageCounts: $microserviceMessageCounts,
        messageSpeed: $messageSpeed,
        lastCommandTime: $lastCommandTime,
        tunnelStatus: $tunnelStatus,
        version: $version,
        IsReadyToUpgrade: $isReadyToUpgrade,
        isReadyToRollback: $isReadyToRollback,
      },
    }))
    def('response', () => Promise.resolve())
    def('subject', () => $subject.updateAgentStatusEndPoint($req, $fog))

    beforeEach(() => {
      $sandbox.stub(AgentService, 'updateAgentStatus').returns($response)
    })

    it('calls AgentService.updateAgentStatus with correct args', async () => {
      await $subject
      expect(AgentService.updateAgentStatus).to.have.been.calledWith({
        daemonStatus: $daemonStatus,
        daemonOperatingDuration: $daemonOperatingDuration,
        daemonLastStart: $daemonLastStart,
        memoryUsage: $memoryUsage,
        diskUsage: $diskUsage,
        cpuUsage: $cpuUsage,
        memoryViolation: $memoryViolation,
        diskViolation: $diskViolation,
        cpuViolation: $cpuViolation,
        microserviceStatus: $microserviceStatus,
        repositoryCount: $repositoryCount,
        repositoryStatus: $repositoryStatus,
        systemTime: $systemTime,
        lastStatusTime: $lastStatusTime,
        ipAddress: $ipAddress,
        processedMessages: $processedMessages,
        microserviceMessageCounts: $microserviceMessageCounts,
        messageSpeed: $messageSpeed,
        lastCommandTime: $lastCommandTime,
        tunnelStatus: $tunnelStatus,
        version: $version,
        IsReadyToUpgrade: $isReadyToUpgrade,
        isReadyToRollback: $isReadyToRollback,
      }, $fog)
    })

    context('when AgentService#updateAgentStatus fails', () => {
      const error = 'Error!'

      def('response', () => Promise.reject(error))

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when AgentService#updateAgentStatus succeeds', () => {
      it(`succeeds`, () => {
        return expect($subject).to.eventually.equal(undefined)
      })
    })
  })

  describe('.getAgentMicroservicesEndPoint()', () => {
    def('fog', () => 'fog!')

    def('req', () => ({
      body: {},
    }))
    def('response', () => Promise.resolve())
    def('subject', () => $subject.getAgentMicroservicesEndPoint($req, $fog))

    beforeEach(() => {
      $sandbox.stub(AgentService, 'getAgentMicroservices').returns($response)
    })

    it('calls AgentService.getAgentMicroservices with correct args', async () => {
      await $subject
      expect(AgentService.getAgentMicroservices).to.have.been.calledWith($fog)
    })

    context('when AgentService#getAgentMicroservices fails', () => {
      const error = 'Error!'

      def('response', () => Promise.reject(error))

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when AgentService#getAgentMicroservices succeeds', () => {
      it(`succeeds`, () => {
        return expect($subject).to.eventually.equal(undefined)
      })
    })
  })

  describe('getAgentMicroserviceEndPoint()', () => {
    def('fog', () => 'fog!')
    def('microserviceUuid', () => 'testUuid')

    def('req', () => ({
      params: {
        microserviceUuid: $microserviceUuid,
      },
    }))
    def('response', () => Promise.resolve())
    def('subject', () => $subject.getAgentMicroserviceEndPoint($req, $fog))

    beforeEach(() => {
      $sandbox.stub(AgentService, 'getAgentMicroservice').returns($response)
    })

    it('calls AgentService.getAgentMicroservice with correct args', async () => {
      await $subject
      expect(AgentService.getAgentMicroservice).to.have.been.calledWith($microserviceUuid, $fog)
    })

    context('when AgentService#getAgentMicroservice fails', () => {
      const error = 'Error!'

      def('response', () => Promise.reject(error))

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when AgentService#getAgentMicroservice succeeds', () => {
      it(`succeeds`, () => {
        return expect($subject).to.eventually.equal(undefined)
      })
    })
  })

  describe('getAgentRegistriesEndPoint()', () => {
    def('fog', () => 'fog!')

    def('req', () => ({
      body: {},
    }))
    def('response', () => Promise.resolve())
    def('subject', () => $subject.getAgentRegistriesEndPoint($req, $fog))

    beforeEach(() => {
      $sandbox.stub(AgentService, 'getAgentRegistries').returns($response)
    })

    it('calls AgentService.getAgentRegistries with correct args', async () => {
      await $subject
      expect(AgentService.getAgentRegistries).to.have.been.calledWith($fog)
    })

    context('when AgentService#getAgentRegistries fails', () => {
      const error = 'Error!'

      def('response', () => Promise.reject(error))

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when AgentService#getAgentRegistries succeeds', () => {
      it(`succeeds`, () => {
        return expect($subject).to.eventually.equal(undefined)
      })
    })
  })

  describe('getAgentTunnelEndPoint()', () => {
    def('fog', () => 'fog!')

    def('req', () => ({
      body: {},
    }))
    def('response', () => Promise.resolve())
    def('subject', () => $subject.getAgentTunnelEndPoint($req, $fog))

    beforeEach(() => {
      $sandbox.stub(AgentService, 'getAgentTunnel').returns($response)
    })

    it('calls AgentService.getAgentTunnel with correct args', async () => {
      await $subject
      expect(AgentService.getAgentTunnel).to.have.been.calledWith($fog)
    })

    context('when AgentService#getAgentTunnel fails', () => {
      const error = 'Error!'

      def('response', () => Promise.reject(error))

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when AgentService#getAgentTunnel succeeds', () => {
      it(`succeeds`, () => {
        return expect($subject).to.eventually.equal(undefined)
      })
    })
  })

  describe('getAgentStraceEndPoint()', () => {
    def('fog', () => 'fog!')

    def('req', () => ({
      body: {},
    }))
    def('response', () => Promise.resolve())
    def('subject', () => $subject.getAgentStraceEndPoint($req, $fog))

    beforeEach(() => {
      $sandbox.stub(AgentService, 'getAgentStrace').returns($response)
    })

    it('calls AgentService.getAgentStrace with correct args', async () => {
      await $subject
      expect(AgentService.getAgentStrace).to.have.been.calledWith($fog)
    })

    context('when AgentService#getAgentStrace fails', () => {
      const error = 'Error!'

      def('response', () => Promise.reject(error))

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when AgentService#getAgentStrace succeeds', () => {
      it(`succeeds`, () => {
        return expect($subject).to.eventually.equal(undefined)
      })
    })
  })

  describe('updateAgentStraceEndPoint()', () => {
    def('fog', () => 'fog!')
    def('microserviceUuid', () => 'microserviceUuid')
    def('buffer', () => 'testBuffer')

    def('straceData', [{
      microserviceUuid: $microserviceUuid,
      buffer: $buffer,
    }])

    def('req', () => ({
      body: {
        straceData: $straceData,
      },
    }))
    def('response', () => Promise.resolve())
    def('subject', () => $subject.updateAgentStraceEndPoint($req, $fog))

    beforeEach(() => {
      $sandbox.stub(AgentService, 'updateAgentStrace').returns($response)
    })

    it('calls AgentService.updateAgentStrace with correct args', async () => {
      await $subject
      expect(AgentService.updateAgentStrace).to.have.been.calledWith({
        straceData: $straceData,
      }, $fog)
    })

    context('when AgentService#updateAgentStrace fails', () => {
      const error = 'Error!'

      def('response', () => Promise.reject(error))

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when AgentService#updateAgentStrace succeeds', () => {
      it(`succeeds`, () => {
        return expect($subject).to.eventually.equal(undefined)
      })
    })
  })

  describe('getAgentChangeVersionCommandEndPoint()', () => {
    def('fog', () => 'fog!')

    def('req', () => ({
      body: {},
    }))
    def('response', () => Promise.resolve())
    def('subject', () => $subject.getAgentChangeVersionCommandEndPoint($req, $fog))

    beforeEach(() => {
      $sandbox.stub(AgentService, 'getAgentChangeVersionCommand').returns($response)
    })

    it('calls AgentService.getAgentChangeVersionCommand with correct args', async () => {
      await $subject
      expect(AgentService.getAgentChangeVersionCommand).to.have.been.calledWith($fog)
    })

    context('when AgentService#getAgentChangeVersionCommand fails', () => {
      const error = 'Error!'

      def('response', () => Promise.reject(error))

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when AgentService#getAgentChangeVersionCommand succeeds', () => {
      it(`succeeds`, () => {
        return expect($subject).to.eventually.equal(undefined)
      })
    })
  })

  describe('updateHalHardwareInfoEndPoint()', () => {
    def('fog', () => 'fog!')

    def('info', () => 'testInfo')

    def('req', () => ({
      body: {
        info: $info,
      },
    }))
    def('response', () => Promise.resolve())
    def('subject', () => $subject.updateHalHardwareInfoEndPoint($req, $fog))

    beforeEach(() => {
      $sandbox.stub(AgentService, 'updateHalHardwareInfo').returns($response)
    })

    it('calls AgentService.updateHalHardwareInfo with correct args', async () => {
      await $subject
      expect(AgentService.updateHalHardwareInfo).to.have.been.calledWith({
        info: $info,
      }, $fog)
    })

    context('when AgentService#updateHalHardwareInfo fails', () => {
      const error = 'Error!'

      def('response', () => Promise.reject(error))

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when AgentService#updateHalHardwareInfo succeeds', () => {
      it(`succeeds`, () => {
        return expect($subject).to.eventually.equal(undefined)
      })
    })
  })

  describe('updateHalUsbInfoEndPoint()', () => {
    def('fog', () => 'fog!')

    def('info', () => 'testInfo')

    def('req', () => ({
      body: {
        info: $info,
      },
    }))
    def('response', () => Promise.resolve())
    def('subject', () => $subject.updateHalUsbInfoEndPoint($req, $fog))

    beforeEach(() => {
      $sandbox.stub(AgentService, 'updateHalUsbInfo').returns($response)
    })

    it('calls AgentService.updateHalUsbInfo with correct args', async () => {
      await $subject
      expect(AgentService.updateHalUsbInfo).to.have.been.calledWith({
        info: $info,
      }, $fog)
    })

    context('when AgentService#updateHalUsbInfo fails', () => {
      const error = 'Error!'

      def('response', () => Promise.reject(error))

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when AgentService#updateHalUsbInfo succeeds', () => {
      it(`succeeds`, () => {
        return expect($subject).to.eventually.equal(undefined)
      })
    })
  })

  describe('deleteNodeEndPoint()', () => {
    def('fog', () => 'fog!')

    def('req', () => ({
      body: {},
    }))
    def('response', () => Promise.resolve())
    def('subject', () => $subject.deleteNodeEndPoint($req, $fog))

    beforeEach(() => {
      $sandbox.stub(AgentService, 'deleteNode').returns($response)
    })

    it('calls AgentService.deleteNode with correct args', async () => {
      await $subject
      expect(AgentService.deleteNode).to.have.been.calledWith($fog)
    })

    context('when AgentService#deleteNode fails', () => {
      const error = 'Error!'

      def('response', () => Promise.reject(error))

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when AgentService#deleteNode succeeds', () => {
      it(`succeeds`, () => {
        return expect($subject).to.eventually.equal(undefined)
      })
    })
  })

  describe('getImageSnapshotEndPoint()', () => {
    def('fog', () => 'fog!')

    def('req', () => ({
      body: {},
    }))
    def('response', () => Promise.resolve())
    def('subject', () => $subject.getImageSnapshotEndPoint($req, $fog))

    beforeEach(() => {
      $sandbox.stub(AgentService, 'getImageSnapshot').returns($response)
    })

    it('calls AgentService.getImageSnapshot with correct args', async () => {
      await $subject
      expect(AgentService.getImageSnapshot).to.have.been.calledWith($fog)
    })

    context('when AgentService#getImageSnapshot fails', () => {
      const error = 'Error!'

      def('response', () => Promise.reject(error))

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when AgentService#getImageSnapshot succeeds', () => {
      it(`succeeds`, () => {
        return expect($subject).to.eventually.equal(undefined)
      })
    })
  })

  describe('putImageSnapshotEndPoint()', () => {
    def('fog', () => 'fog!')

    def('req', () => ({
      body: {},
    }))
    def('response', () => Promise.resolve())
    def('subject', () => $subject.putImageSnapshotEndPoint($req, $fog))

    beforeEach(() => {
      $sandbox.stub(AgentService, 'putImageSnapshot').returns($response)
    })

    it('calls AgentService.putImageSnapshot with correct args', async () => {
      await $subject
      expect(AgentService.putImageSnapshot).to.have.been.calledWith($req, $fog)
    })

    context('when AgentService#putImageSnapshot fails', () => {
      const error = 'Error!'

      def('response', () => Promise.reject(error))

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when AgentService#putImageSnapshot succeeds', () => {
      it(`succeeds`, () => {
        return expect($subject).to.eventually.equal(undefined)
      })
    })
  })


  describe('postTrackingEndPoint()', () => {
    def('fog', () => 'fog!')

    def('req', () => ({
      body: {events: []},
    }))
    def('response', () => Promise.resolve())
    def('subject', () => $subject.postTrackingEndPoint($req, $fog))

    beforeEach(() => {
      $sandbox.stub(AgentService, 'postTracking').returns($response)
    })

    it('calls AgentService.postTrackingEndPoint with correct args', async () => {
      await $subject
      expect(AgentService.postTracking).to.have.been.calledWith($req.body.events, $fog)
    })

    context('when AgentService#postTrackingEndPoint fails', () => {
      const error = 'Error!'

      def('response', () => Promise.reject(error))

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when AgentService#postTrackingEndPoint succeeds', () => {
      it(`succeeds`, () => {
        return expect($subject).to.eventually.equal(undefined)
      })
    })
  })
})
