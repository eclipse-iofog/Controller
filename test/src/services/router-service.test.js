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
const Errors = require('../../../src/helpers/errors')
const ErrorMessages = require('../../../src/helpers/error-messages')

describe('Router Service', () => {
  const transaction = {}
  const randomString = 'randomString'
  const now = Date.now()

  const routerCatalogItem = {
    id: 5
  }

  const userId = 1

  def('subject', () => RouterService)
  def('sandbox', () => sinon.createSandbox())
  def('routerCatalogItem', () => routerCatalogItem)
  def('getRouterCatalogItemResponse', () => Promise.resolve(routerCatalogItem))

  beforeEach(() => {
    $sandbox.stub(AppHelper, 'generateRandomString').returns(randomString)
    $sandbox.stub(CatalogService, 'getRouterCatalogItem').returns($getRouterCatalogItemResponse)
    $sandbox.stub(Date, 'now').returns(now)
  })
  afterEach(() => $sandbox.restore())

  describe('.createRouterForFog()', () => {  
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
      isEdge: false,
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

    beforeEach(() => {
      $sandbox.stub(RouterManager, 'create').returns($createRouterResponse)
      $sandbox.stub(RouterConnectionManager, 'create')
      $sandbox.stub(MicroservicePortManager, 'create')
      $sandbox.stub(MicroserviceManager, 'create').returns($createRouterMsvcResponse)
      $sandbox.stub(MicroserviceEnvManager, 'create')
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
        config: '{"mode":"edge","id":"agentuuid","listeners":[{"role":"normal","host":"0.0.0.0","port":1234}],"connectors":[{"name":"agentDestUuid","role":"edge","host":"agentDestHost","port":4567}]}',
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
      return expect(MicroservicePortManager.create).to.have.been.calledWith(mappingData, transaction)
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
        await $subject      
        return expect(MicroserviceManager.create).to.have.been.calledWith({
          uuid: randomString,
          name: `Router for Fog ${uuid}`,
          config: `{"mode":"interior","id":"${uuid}","listeners":[{"role":"normal","host":"0.0.0.0","port":${$fogData.messagingPort}},{"role":"inter-router","host":"0.0.0.0","port":${$fogData.interRouterPort}},` + 
            `{"role":"edge","host":"0.0.0.0","port":${$fogData.edgeRouterPort}}],"connectors":[{"name":"agentDestUuid","role":"inter-router","host":"agentDestHost","port":43290}]}`,
          catalogItemId: routerCatalogItem.id,
          iofogUuid: uuid,
          rootHostAccess: false,
          logSize: 50,
          userId,
          configLastUpdated: now
        }, transaction)
        })
    })
  })

  describe('.updateConfig', () => {
    const routerID = 42
    const router = {
      id: routerID,
      isEdge: true,
      iofogUuid: 'fogUuid',
      messagingPort: 5672
    }
    def('routerID', () => routerID)
    def('subject', () => $subject.updateConfig($routerID, userId, transaction))
    def('router', () => router)
    def('findOneRouterResponse', () => Promise.resolve($router))
    
    const microserviceConfig = {
      mode: 'edge',
      id: router.iofogUuid,
      listeners: [
        {
          role: 'normal',
          host: '0.0.0.0',
          port: router.messagingPort
        }
      ]
    }
    
    def('microserviceConfig', () => microserviceConfig)
    def('upstreamRouters', () => [])
    def('findAllWithRoutersResponse', () => Promise.resolve($upstreamRouters))
    def('routerMsvc', () => ({
      id: 1,
      uuid: 'routerMsvcUuid',
      iofogUuid: $router.iofogUuid,
      catalogItemId: $routerCatalogItem.id,
      config: JSON.stringify($microserviceConfig)
    }))
    def('msvcFindOneResponse', () => Promise.resolve($routerMsvc))

    beforeEach(() => {
      $sandbox.stub(RouterManager, 'findOne').returns($findOneRouterResponse)
      $sandbox.stub(RouterConnectionManager, 'findAllWithRouters').returns($findAllWithRoutersResponse)
      $sandbox.stub(MicroserviceManager, 'findOne').returns($msvcFindOneResponse)
      $sandbox.stub(MicroserviceManager, 'update').returns(Promise.resolve())
      $sandbox.stub(MicroserviceEnvManager, 'delete')
      $sandbox.stub(MicroserviceEnvManager, 'updateOrCreate')
      $sandbox.stub(MicroserviceEnvManager, 'update')
    })

    it('Should look for the router by id', async () => {
      await $subject
      return expect(RouterManager.findOne).to.have.been.calledOnceWith({id: $routerID}, transaction)
    })

    it('Should look for upstream routers', async () => {
      await $subject
      return expect(RouterConnectionManager.findAllWithRouters).to.have.been.calledOnceWith({ sourceRouter: $router.id }, transaction)
    })

    it('Should look for the router msvc', async () => {
      await $subject
      return expect(MicroserviceManager.findOne).to.have.been.calledOnceWith({
        catalogItemId: $routerCatalogItem.id,
        iofogUuid: $router.iofogUuid
      }, transaction)
    })

    context('Router not found', () => {
      def('findOneRouterResponse', () => Promise.resolve(null))

      it('Should error with Not found', async() => {
        try {
          await $subject
        } catch (e) {
          return expect(e).to.be.instanceOf(Errors.NotFoundError)
        }
        return expect(true).to.eql(false)
      })
    })

    context('Router msvc not found', () => {
      def('msvcFindOneResponse', () => Promise.resolve(null))

      it('Should error with Not found', async() => {
        try {
          await $subject
        } catch (e) {
          return expect(e).to.be.instanceOf(Errors.NotFoundError)
        }
        return expect(true).to.eql(false)
      })
    })
  })

  describe('.updateRouter', () => {
    const oldRouter = {
      id: 42,
      isEdge: true,
      messagingPort: 33123,
      host: 'oldRouterHost',
      iofogUuid: 'agentUuid'
    }

    const newRouterData = {
      ...oldRouter,
      host: 'newRouterHost',
      id: undefined
    }

    const upstreamRouters = []

    const microserviceConfig = {
      mode: 'edge',
      id: oldRouter.iofogUuid,
      listeners: [
        {
          role: 'normal',
          host: '0.0.0.0',
          port: oldRouter.messagingPort
        }
      ]
    }
    
    const routerMsvc = {
      id: 5,
      catalogItemId: routerCatalogItem.id,
      uuid: 'routerMsvc',
      iofogUuid: oldRouter.iofogUuid,
      config: JSON.stringify(microserviceConfig)
    }

    def('subject', () => $subject.updateRouter(oldRouter, newRouterData, upstreamRouters, userId, transaction))
    def('oldRouter', () => oldRouter)
    def('newRouterData', () => newRouterData)
    def('upstreamRouters', () => upstreamRouters)
    def('routerMsvc', () => routerMsvc)
    def('routerMsvcResponse', () => Promise.resolve($routerMsvc))
    def('findAllWithRoutersResponse', () => Promise.resolve($upstreamRouters))
    def('findOneRouterResponse', () => Promise.resolve({...$newRouterData, id: $oldRouter.id}))

    let findallWithRoutersStub
    beforeEach(() => {
      $sandbox.stub(MicroserviceManager, 'findOne').returns($routerMsvcResponse)
      $sandbox.stub(MicroserviceManager, 'update').returns(Promise.resolve())
      $sandbox.stub(RouterManager, 'update')
      $sandbox.stub(RouterConnectionManager, 'bulkCreate')
      findallWithRoutersStub = $sandbox.stub(RouterConnectionManager, 'findAllWithRouters')
      findallWithRoutersStub.returns($findAllWithRoutersResponse)
      $sandbox.stub(ChangeTrackingService, 'update')
      $sandbox.stub(RouterManager, 'findOne').returns($findOneRouterResponse)
      $sandbox.stub(MicroserviceEnvManager, 'delete')
      $sandbox.stub(MicroserviceEnvManager, 'updateOrCreate')
      $sandbox.stub(MicroserviceEnvManager, 'update')
    })

    it('Should update the router', async () => {
      await $subject
      return expect(RouterManager.update).to.have.been.calledWith({id: $oldRouter.id }, newRouterData, transaction)
    })

    it('Should update the tracking service', async () => {
      await $subject
      expect(ChangeTrackingService.update).to.have.been.calledWith($oldRouter.iofogUuid, ChangeTrackingService.events.routerChanged, transaction)
      return expect(ChangeTrackingService.update).to.have.been.calledWith($oldRouter.iofogUuid, ChangeTrackingService.events.microserviceList, transaction)
    })

    context('Interior to edge', () => {
      const interRouterPort = 3123123
      const edgeRouterPort = 3123
      def('downstreamRoutersResponse', () => Promise.resolve([]))

      beforeEach(() => {
        oldRouter.isEdge = false
        oldRouter.interRouterPort = interRouterPort
        oldRouter.edgeRouterPort = edgeRouterPort
        $sandbox.stub(RouterConnectionManager, 'findAll').withArgs({ destRouter: $oldRouter.id }, transaction).returns($downstreamRoutersResponse)
        $sandbox.stub(MicroservicePortManager, 'delete')
      })

      afterEach(() => {
        oldRouter.isEdge = true
        delete oldRouter.interRouterPort
        delete oldRouter.edgeRouterPort
      })

      it('should delete router ports', async () => {
        await $subject
        expect(MicroservicePortManager.delete).to.have.been.calledTwice
        expect(MicroservicePortManager.delete).to.have.been.calledWith({ microserviceUuid: $routerMsvc.uuid, portInternal: edgeRouterPort }, transaction)
        expect(MicroservicePortManager.delete).to.have.been.calledWith({ microserviceUuid: $routerMsvc.uuid, portInternal: interRouterPort }, transaction)
        return expect(RouterManager.update).to.have.been.calledWith({ id: $oldRouter.id }, { ...$newRouterData, interRouterPort: null, edgeRouterPort: null }, transaction)
      })

      context('With downstream routers', () => {
        def('downstreamRoutersResponse', () => Promise.resolve([{}]))
        it('Should fail with validation error', async () => {
          try{
            await $subject
          } catch(e) {
            return expect(e).to.be.instanceOf(Errors.ValidationError)
          }
          return expect(true).to.eql(false)
        })
      })
    })

    context('Edge to interior', () => {
      const interRouterPort = 3123123
      const edgeRouterPort = 3123

      beforeEach(() => {
        newRouterData.isEdge = false
        newRouterData.interRouterPort = interRouterPort
        newRouterData.edgeRouterPort = edgeRouterPort
        $sandbox.stub(MicroservicePortManager, 'create')
      })

      afterEach(() => {
        newRouterData.isEdge = true
        delete newRouterData.interRouterPort
        delete newRouterData.edgeRouterPort
      })

      it('should create router ports', async () => {
        const mappingData = {
          isPublic: false,
          userId: userId,
          microserviceUuid: $routerMsvc.uuid
        }
        await $subject
        expect(MicroservicePortManager.create).to.have.been.calledTwice
        expect(MicroservicePortManager.create).to.have.been.calledWith({ ...mappingData, portInternal: edgeRouterPort, portExternal: edgeRouterPort }, transaction)
        expect(MicroservicePortManager.create).to.have.been.calledWith({ ...mappingData, portInternal: interRouterPort, portExternal: interRouterPort }, transaction)
        return expect(RouterManager.update).to.have.been.calledWith({ id: $oldRouter.id }, { ...newRouterData }, transaction)
      })

    })

    context('With upstream routers to delete', () => {
      const upstreamRoutersConnections = [{
        id: 1,
        destRouter: 2,
        dest: {
          id: 2,
          iofogUuid: 'agentDestUuid',
          host: 'agentDestHost',
          isEdge: false,
          edgeRouterPort: 4567,
          interRouterPort: 43290,
        }
      }]
      def('upstreamRouters', () => upstreamRoutersConnections)

      beforeEach(() => {
        $sandbox.stub(RouterConnectionManager, 'delete')
      })

      it('should delete upstream routers connections', async () => {
        await $subject
        expect(RouterConnectionManager.delete).to.have.callCount(upstreamRoutersConnections.length)
        for (const upstreamRouterConnection of upstreamRoutersConnections) {
          expect(RouterConnectionManager.delete).to.have.been.calledWith({ id: upstreamRouterConnection.id }, transaction)
        }
      })
    })

    context('With upstream routers to create', () => {
      const upstreamRouters = [{
        id: 2,
        iofogUuid: 'agentDestUuid',
        host: 'agentDestHost',
        isEdge: false,
        edgeRouterPort: 4567,
        interRouterPort: 43290,
      }]
      def('subject', () => RouterService.updateRouter(oldRouter, newRouterData, upstreamRouters, userId, transaction))

      it('should create upstream routers connections', async () => {
        await $subject
        return expect(RouterConnectionManager.bulkCreate).to.have.been.calledWith(upstreamRouters.map(r => ({ sourceRouter: $oldRouter.id, destRouter: r.id })), transaction)
      })
    })
  })

  describe('.getDefaultRouter', () => {
    const defaultRouter = {
      id: 56,
      isDefault: true,
      messagingPort: 5672,
      edgeRouterPort: 31231,
      interRouterPort: 3213133,
      host: 'defaultRouterHost'
    }

    def('subject', () => $subject.getDefaultRouter(transaction))
    def('defaultRouter', () => defaultRouter)
    def('findOneRouter', () => Promise.resolve($defaultRouter))

    beforeEach(() => {
      $sandbox.stub(RouterManager, 'findOne').returns($findOneRouter)
    })

    it('Should return the default router', async () => {
      expect(await $subject).to.eql({
        host: defaultRouter.host,
        messagingPort: defaultRouter.messagingPort,
        edgeRouterPort: defaultRouter.edgeRouterPort,
        interRouterPort: defaultRouter.interRouterPort
      })

      return expect(RouterManager.findOne).to.have.been.calledWith({isDefault: true}, transaction)
    })

    context('There is no default router', () => {
      def('findOneRouter', () => Promise.resolve(null))
      it('Should fail with error: Not Found', async () => {
        try{
          await $subject
        } catch(e) {
          return expect(e).to.be.instanceOf(Errors.NotFoundError)
        }
        return expect(true).to.eql(false)
      })
    })
  })

  describe('.getNetworkRouter', () => {
    const routerID = 42

    const defaultRouter = {
      id: 56,
      isDefault: true,
      iofogUuid: 'systemFogUuid',
      messagingPort: 5672,
      edgeRouterPort: 31231,
      interRouterPort: 3213133,
      host: 'defaultRouterHost'
    }

    const router = {
      id: routerID,
      isDefault: false,
      iofogUuid: 'interiorRouterUuid',
      messagingPort: 4234,
      edgeRouterPort: 4224,
      interRouterPort: 333,
      host: 'routerHost'
    }

    def('subject', () => $subject.getNetworkRouter(routerID, transaction))
    def('router', () => router)
    def('findOneRouter', () => Promise.resolve($router))

    beforeEach(() => {
      $sandbox.stub(RouterManager, 'findOne').returns($findOneRouter)
    })

    it('Should return the requested router', async () => {
      expect(await $subject).to.eql(router)

      return expect(RouterManager.findOne).to.have.been.calledWith({iofogUuid: routerID}, transaction)
    })

    context('There is no id requested', () => {
      def('subject', () => RouterService.getNetworkRouter(null, transaction))
      def('router', () => defaultRouter)

      it('Should return the default router', async () => {
        expect(await $subject).to.eql(defaultRouter)
  
        return expect(RouterManager.findOne).to.have.been.calledWith({isDefault: true}, transaction)
      })
    })
  })

  describe('.upsertDefaultRouter', () => {
    const interRouterPort = 3214
    const edgeRouterPort = 9403
    const messagingPort = 4235
    const routerData = {
      host: 'routerHost',
      edgeRouterPort,
      interRouterPort,
      messagingPort
    }

    const createRouterData = {
      isEdge: false,
      messagingPort,
      interRouterPort,
      edgeRouterPort,
      host: routerData.host,
      isDefault: true
    }


    def('validatorResponse', () => Promise.resolve(true))
    def('subject', () => $subject.upsertDefaultRouter(routerData, transaction))

    beforeEach(() => {
      $sandbox.stub(Validator, 'validate').returns($validatorResponse)
      $sandbox.stub(RouterManager, 'updateOrCreate')
    })

    
    it('calls Validator#validate() with correct args', async () => {
      await $subject
      expect(Validator.validate).to.have.been.calledWith(routerData, Validator.schemas.defaultRouterCreate)
    })

    context('when Validator#validate() fails', () => {
      const error = { message: 'Failed validation' }
      def('validatorResponse', () => Promise.reject(error))

      it(`fails with ${error}`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    it('Should update or create router', async () => {
      await $subject
      return expect(RouterManager.updateOrCreate).to.have.been.calledWith({ isDefault: true }, createRouterData, transaction)
    })

    context('Port not provided', () => {
      beforeEach(() => {
        delete routerData.interRouterPort
        delete routerData.edgeRouterPort
        delete routerData.messagingPort
      })

      afterEach(() => {
        routerData.edgeRouterPort = edgeRouterPort
        routerData.messagingPort = messagingPort
        routerData.interRouterPort = interRouterPort
      })

      it('Should update or create router with default port values', async () => {
        await $subject
        return expect(RouterManager.updateOrCreate).to.have.been.calledWith({ isDefault: true }, {...createRouterData, messagingPort: 5672, interRouterPort: 56721, edgeRouterPort: 56722}, transaction)
      })
    })
  })

  describe('.validateAndReturnUpstreamRouters', () => {
    const upstreamRouterIds = ['agent1', 'default-router']
    const isSystemFog = false
    const defaultRouter = {
      id: 1,
      isSystem: true,
      isDefault: true,
      isEdge: false,
      edgeRouterPort: 56722,
      interRouterPort: 56721,
      messagingPort: 5672,
      host: 'defaultRouterHost',
      iofogUuid: 'systemFogUuid',
    }

    context('No upstreamRouterIds', () => {
      context('No default router', () => {
        context('Is not system fog', () => {
          def('subject', () => $subject.validateAndReturnUpstreamRouters(null, false, null, transaction))
          it ('Should error with Not found', async () => {
            try{
              await $subject
            } catch(e) {
              return expect(e).to.be.instanceOf(Errors.NotFoundError)
            }
            return expect(true).to.eql(false)
          })
        })
        context('Is system fog', () => {
          def('subject', () => $subject.validateAndReturnUpstreamRouters(null, true, null, transaction))
          it ('Should return an empty array', async () => {
            return expect(await $subject).to.eql([])
          })
        })
      })
      context('There is a default router', () => {
        def('subject', () => $subject.validateAndReturnUpstreamRouters(null, true, defaultRouter, transaction))
        it ('Should return an empty array', async () => {
          return expect(await $subject).to.eql([defaultRouter])
        })
      })
    })

    context('There are upstream routers', () => {
      const upstreamRouter = {
        id: 42,
        iofogUuid: 'agent1',
        isSystem: false,
        isEdge: false,
        isDefault: false,
        edgeRouterPort: 56722,
        interRouterPort: 56721,
        messagingPort: 5672,
        host: 'agent1Host',
      }
      
      def('findOneRouterResponse', () => Promise.resolve(upstreamRouter))
      def('subject', () => $subject.validateAndReturnUpstreamRouters(upstreamRouterIds, false, defaultRouter, transaction))
      
      beforeEach(() => {
        $sandbox.stub(RouterManager, 'findOne').returns($findOneRouterResponse)
      })

      it('Should return an array with upstreamRouter and defaultRouter', async () => {
        return expect(await $subject).to.eql([upstreamRouter, defaultRouter])
      })

      context('upstreamRouter is edge', () => {
        beforeEach(() => {
          upstreamRouter.isEdge = true
        })
        afterEach(() => {
          upstreamRouter.isEdge = false
        })

        it('Should error with Validation error', async () => {
          try{
            await $subject
          } catch(e) {
            return expect(e).to.be.instanceOf(Errors.ValidationError)
          }
          return expect(true).to.eql(false)
        })
      })

      context('upstreamRouter is not found', () => {
        def('findOneRouterResponse', () => Promise.resolve(null))

        it('Should error with Not found error', async () => {
          try{
            await $subject
          } catch(e) {
            return expect(e).to.be.instanceOf(Errors.NotFoundError)
          }
          return expect(true).to.eql(false)
        })
      })
    })
  })
})