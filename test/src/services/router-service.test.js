const { expect } = require('chai')
const sinon = require('sinon')

const RouterManager = require('../../../src/data/managers/router-manager')
const RouterConnectionManager = require('../../../src/data/managers/router-connection-manager')
const MicroservicePortManager = require('../../../src/data/managers/microservice-port-manager')
const MicroserviceEnvManager = require('../../../src/data/managers/microservice-env-manager')
const MicroserviceManager = require('../../../src/data/managers/microservice-manager')
const RouterService = require('../../../src/services/router-service')
const CatalogService = require('../../../src/services/catalog-service')
const Validator = require('../../../src/schemas')
const AppHelper = require('../../../src/helpers/app-helper')
const ioFogManager = require('../../../src/data/managers/iofog-manager')
const ChangeTrackingService = require('../../../src/services/change-tracking-service')
const Sequelize = require('sequelize')
const Op = Sequelize.Op

describe('Router Service', () => {
  def('subject', () => RouterService)
  def('sandbox', () => sinon.createSandbox())

  const randomString = 'randomString'
  const now = Date.now()

  beforeEach(() => {
    $sandbox.stub(AppHelper, 'generateRandomString').returns(randomString)
    $sandbox.stub(Date, 'now').returns(now)
  })
  afterEach(() => $sandbox.restore())

  describe('.createRouterForFog()', () => {
    const transaction = {}
  
    const fogData = {
      routerMode: 'edge',
      messagingPort: 1234,
      isSystem: false
    }
  
    const uuid = 'agentuuid'

    const upstreamRouters = [{
      id: 2,
      iofogUuid: 'agentDestUuid',
      host: 'agentDestHost',
      edgeRouterPort: 4567,
      interRouterPort: 43290,
    }]

    const userId = 1

    const routerMsvc = {
      uuid: 'routerMsvcUuid',
    }

    const routerData = {
      iofogUuid: uuid,
      edgeRouterPort: null,
      interRouterPort: null,
      isDefault: false,
      isEdge: true,
      messagingPort: fogData.messagingPort,
      host: fogData.host
    }

    const router = {
      ...routerData,
      id: 1
    }

    const routerCatalogItem = {
      id: 5
    }

    let microserviceConfig = 'router {\n  mode: edge\n  id: ' + uuid + '\n}'
    microserviceConfig += '\nlistener {\n  role: normal\n  host: 0.0.0.0\n  port: ' + fogData.messagingPort + '\n}'

    for (const upstreamRouter of upstreamRouters) {
      microserviceConfig += '\nconnector {\n  name: ' + (upstreamRouter.iofogUuid) +
      '\n  host: ' + upstreamRouter.host +
      '\n  port: ' + upstreamRouter.edgeRouterPort +
      '\n  role: edge\n}'
    }

    def('fogData', () => fogData)
    def('subject', () => $subject.createRouterForFog($fogData, uuid, userId, upstreamRouters, transaction))
    def('createRouterResponse', () => Promise.resolve(router))
    def('createRouterMsvcResponse', () => Promise.resolve(routerMsvc))
    def('routerCatalogItem', () => Promise.resolve(routerCatalogItem))

    beforeEach(() => {
      $sandbox.stub(RouterManager, 'create').returns($createRouterResponse)
      $sandbox.stub(RouterConnectionManager, 'create')
      $sandbox.stub(MicroservicePortManager, 'create')
      $sandbox.stub(MicroserviceManager, 'create').returns($createRouterMsvcResponse)
      $sandbox.stub(MicroserviceEnvManager, 'create')
      $sandbox.stub(CatalogService, 'getRouterCatalogItem').returns($routerCatalogItem)
    })

    it('should create a router', async () => {
      await $subject
      return expect(RouterManager.create).to.have.been.calledWith(routerData, transaction)
    })

    it('should create upstream router connections', async () => {
      await $subject
      for (const upstreamRouter of upstreamRouters) {
        expect(RouterConnectionManager.create).to.have.been.calledWith({
          sourceRouter: router.id, destRouter: upstreamRouter.id
        }, transaction)
      }
    })

    it('should create a router microservice', async () => {
      await $subject
      expect(MicroserviceManager.create).to.have.been.calledWith({
        uuid: randomString,
        name: `Router for Fog ${uuid}`,
        config: '{}',
        catalogItemId: routerCatalogItem.id,
        iofogUuid: uuid,
        rootHostAccess: false,
        logSize: 50,
        userId,
        configLastUpdated: now
      }, transaction)
      const mappingData = {
        isPublic: false,
        portInternal: fogData.messagingPort,
        portExternal: fogData.messagingPort,
        userId: userId,
        microserviceUuid: routerMsvc.uuid
      }
      expect(MicroservicePortManager.create).to.have.been.calledWith(mappingData, transaction)
      return expect(MicroserviceEnvManager.create).to.have.been.calledWith({
        key: 'QDROUTERD_CONF', value: microserviceConfig, microserviceUuid: routerMsvc.uuid
      }, transaction)
      })


    context('Messaging port not specified', () => {
      def('fogData', () => ({...fogData, messagingPort: undefined}))

      it('Should default to 5672', async () => {
        const port = 5672
        const mappingData = {
          isPublic: false,
          portInternal: port,
          portExternal: port,
          userId: userId,
          microserviceUuid: routerMsvc.uuid
        }
        await $subject
        expect(RouterManager.create).to.have.been.calledWith({...routerData, messagingPort: port}, transaction)
        return expect(MicroservicePortManager.create).to.have.been.calledWith(mappingData, transaction)
      })
    })

    context('Edge router', () => {
      it('Should only open messaging port', async () => {
        await $subject
        expect(MicroservicePortManager.create).to.have.been.calledOnce
      })

      it('Should not create the QDROUTERD_AUTO_MESH_DISCOVERY env variable', async () => {
        await $subject
        expect(MicroserviceEnvManager.create).to.have.been.calledOnce
      })
    })

    context('Interior router', () => {
      const interRouterPort = 9087
      const edgeRouterPort = 5436
      def('fogData', () => ({...fogData, routerMode: 'interior', interRouterPort, edgeRouterPort}))
      def('createRouterResponse', () => Promise.resolve({...router, edgeRouterPort, interRouterPort, isEdge: false}))
    
      it('Should open messaging, edge and inter port', async () => {
        await $subject
        const mappingData = {
          isPublic: false,
          userId: userId,
          microserviceUuid: routerMsvc.uuid
        }
        expect(MicroservicePortManager.create).to.have.been.calledWith({...mappingData, portExternal: interRouterPort, portInternal: interRouterPort}, transaction)
        expect(MicroservicePortManager.create).to.have.been.calledWith({...mappingData, portExternal: edgeRouterPort, portInternal: edgeRouterPort}, transaction)
        return expect(MicroservicePortManager.create).to.have.been.calledThrice
      })

      it('Should have interior router msvc config', async () => {
        let microserviceConfig = 'router {\n  mode: interior\n  id: ' + uuid + '\n}'
        microserviceConfig += '\nlistener {\n  role: normal\n  host: 0.0.0.0\n  port: ' + $fogData.messagingPort + '\n}'
        microserviceConfig += '\nlistener {\n  role: inter-router\n  host: 0.0.0.0\n  port: ' + $fogData.interRouterPort + '\n  saslMechanisms: ANONYMOUS\n  authenticatePeer: no\n}'
        microserviceConfig += '\nlistener {\n  role: edge\n  host: 0.0.0.0\n  port: ' + $fogData.edgeRouterPort + '\n  saslMechanisms: ANONYMOUS\n  authenticatePeer: no\n}'
        
        for (const upstreamRouter of upstreamRouters) {
          microserviceConfig += '\nconnector {\n  name: ' + (upstreamRouter.iofogUuid) +
          '\n  host: ' + upstreamRouter.host +
          '\n  port: ' + upstreamRouter.interRouterPort +
          '\n  role: inter-router\n}'
        }

        await $subject      
        return expect(MicroserviceEnvManager.create).to.have.been.calledWith({
          key: 'QDROUTERD_CONF', value: microserviceConfig, microserviceUuid: routerMsvc.uuid
        }, transaction)
      })

      it('Should create the QDROUTERD_AUTO_MESH_DISCOVERY env variable', async () => {
        await $subject
        expect(MicroserviceEnvManager.create).to.have.been.calledTwice
        return expect(MicroserviceEnvManager.create).to.have.been.calledWith({
          key: 'QDROUTERD_AUTO_MESH_DISCOVERY', value: 'QUERY', microserviceUuid: routerMsvc.uuid
        }, transaction)
      })
    })
  })
})