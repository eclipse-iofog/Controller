const { expect } = require('chai')
const sinon = require('sinon')

const ServiceBridgeConfig = require('../../../src/services/service-bridge-config')
const IofogService = require('../../../src/services/iofog-service')
const FogManager = require('../../../src/data/managers/iofog-manager')
const MicroserviceManager = require('../../../src/data/managers/microservice-manager')
const ChangeTrackingService = require('../../../src/services/change-tracking-service')
const ApplicationManager = require('../../../src/data/managers/application-manager')

describe('Service bridge config', () => {
  def('sandbox', () => sinon.createSandbox())
  const transaction = {}

  afterEach(() => $sandbox.restore())

  describe('.stripServiceDerivedBridges()', () => {
    it('removes service-derived listeners and connectors while preserving router bridges', () => {
      const baseConfig = {
        bridges: {
          tcpListeners: {
            'api-listener': { name: 'api-listener', port: '9000', address: 'api' },
            'fog-amqp': { name: 'fog-amqp', port: '5672', address: 'amqp' }
          },
          tcpConnectors: {
            'api-connector': { name: 'api-connector', host: 'hub', port: '8080' },
            'upstream-router': { name: 'upstream-router', host: '10.0.0.2', port: '55671' }
          }
        }
      }

      const stripped = ServiceBridgeConfig.stripServiceDerivedBridges(baseConfig)

      expect(stripped.bridges.tcpListeners).to.eql({
        'fog-amqp': { name: 'fog-amqp', port: '5672', address: 'amqp' }
      })
      expect(stripped.bridges.tcpConnectors).to.eql({
        'upstream-router': { name: 'upstream-router', host: '10.0.0.2', port: '55671' }
      })
    })
  })

  describe('.recomputeServiceBridgeConfig()', () => {
    const fogUuid = 'fog-1'
    const fog = {
      uuid: fogUuid,
      name: 'edge-a',
      tags: [{ value: 'service:site-a' }]
    }
    const services = [
      { name: 'api', bridgePort: 9001 },
      { name: 'mqtt', bridgePort: 9002 }
    ]
    const routerMicroservice = { uuid: 'router-ms-1' }

    beforeEach(() => {
      $sandbox.stub(FogManager, 'findOneWithTags').resolves(fog)
      $sandbox.stub(FogManager, 'findOne').resolves(fog)
      $sandbox.stub(IofogService, '_extractServiceTags').resolves(['site-a'])
      $sandbox.stub(IofogService, '_findMatchingServices').resolves(services)
      $sandbox.stub(ApplicationManager, 'findOne').resolves({ id: 10, name: 'system-edge-a', isSystem: true })
      $sandbox.stub(MicroserviceManager, 'findOne').resolves(routerMicroservice)
      $sandbox.stub(MicroserviceManager, 'update').resolves()
      $sandbox.stub(MicroserviceManager, 'delete').resolves()
      $sandbox.stub(MicroserviceManager, 'findAll').resolves([])
      $sandbox.stub(ChangeTrackingService, 'update').resolves()
    })

    it('rebuilds service listeners from the catalog and persists router config', async () => {
      const baseConfig = {
        bridges: {
          tcpListeners: {
            'stale-listener': { name: 'stale-listener', port: '8000', address: 'stale' }
          },
          tcpConnectors: {}
        }
      }

      const result = await ServiceBridgeConfig.recomputeServiceBridgeConfig(fogUuid, baseConfig, transaction)

      expect(result.bridges.tcpListeners).to.eql({
        'api-listener': { name: 'api-listener', port: '9001', address: 'api' },
        'mqtt-listener': { name: 'mqtt-listener', port: '9002', address: 'mqtt' }
      })
      expect(MicroserviceManager.update).to.have.been.calledOnce
      expect(ChangeTrackingService.update).to.have.been.calledWith(
        fogUuid,
        ChangeTrackingService.events.microserviceConfig,
        transaction
      )
    })

    it('clears stale service listeners when no services match', async () => {
      IofogService._extractServiceTags.resolves([])
      const baseConfig = {
        bridges: {
          tcpListeners: {
            'api-listener': { name: 'api-listener', port: '9001', address: 'api' }
          },
          tcpConnectors: {}
        }
      }

      const result = await ServiceBridgeConfig.recomputeServiceBridgeConfig(fogUuid, baseConfig, transaction)

      expect(result.bridges.tcpListeners).to.eql({})
      expect(MicroserviceManager.update).to.have.been.calledOnce
    })
  })
})
