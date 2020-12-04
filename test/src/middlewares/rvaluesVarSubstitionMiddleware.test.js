const { expect } = require('chai')
const sinon = require('sinon')

const { rvaluesVarSubstitionMiddleware } = require('../../../src/helpers/template-helper')
const UserManager = require('../../../src/data/managers/user-manager')
const MicroservicesService = require('../../../src/services/microservices-service')
const FogService = require('../../../src/services/iofog-service')
const EdgeResourceService = require('../../../src/services/edge-resource-service')

describe('rvaluesVarSubstitionMiddleware', () => {
  def('subject', () => rvaluesVarSubstitionMiddleware)
  def('sandbox', () => sinon.createSandbox())

  afterEach(() => $sandbox.restore())

  context('GET request method not calling microservices and fog list services', () => {
    def('user', () => 'user!')

    def('name', () => 'testName')
    def('description', () => 'testDescription')
    def('isActivated', () => true)

    def('req', () => ({
      method: 'GET',
      body: {
        name: $name,
      },
    }))

    def('responseApp', () => Promise.resolve())
    def('responseFogList', () => Promise.resolve())
    def('response', () => Promise.resolve())
    def('nextfct', () => sinon.spy() )
    def('subject', () => $subject($req, $response, $nextfct ))

    beforeEach(() => {
      $sandbox.stub(UserManager, 'checkAuthentication').resolves({ user: $user})
      $sandbox.stub(MicroservicesService, 'listMicroservicesEndPoint').resolves($responseApp)
      $sandbox.stub(FogService, 'getFogListEndPoint').resolves($responseFogList)
    })

    it('not calls listMicroservicesEndPoint and getFogListEndPoint GET method', async () => {
      await $subject
      expect($nextfct).to.have.been.called
      expect(FogService.getFogListEndPoint).to.not.have.been.called
      expect(MicroservicesService.listMicroservicesEndPoint).to.not.have.been.called
    })

    context('when variable interpolation/expansion needed', () => {
      def('req', () => ({
        method: 'POST',
        headers: { authorization: $token },
        body: {
          name: $name,
          description: '{{ self.name | upcase }}',
        },
      }))
  
      def('responseApp', ({ 
        microservices: []
      }))
      def('responseFogList', ({ 
        fogs: []
      }))

      it(`succeeds`, async () => {
        await $subject
        expect($req.body.description).to.be.equal($name.toUpperCase())
      })
    })
  })

  context('POST request method calling microservices and fogs list services', () => {
    def('token', () => 'token!')

    def('name', () => 'testName')
    def('description', () => 'testDescription')
    def('isActivated', () => true)

    def('body', () => ({
      body: {
        name: $name,
        description: '{{ self.name | upcase }}',
        service1URL: ''
      },
    }))
    def('req', () => ({
      method: 'POST',
      query: { application: $name },
      headers: { authorization: $token },
      ...$body
    }))

    def('responseApp', ({ 
      microservices: []
    }))
    def('responseFogList', ({ 
      fogs: []
    }))
    def('responseEdgeRes', ({ 
      edgeResources: { name: 'testedgeres'}
    }))
    def('auth', () => ({user: $token}))
    def('response', () => Promise.resolve())
    def('nextfct', () => sinon.spy() )
    def('subject', () => $subject($req, $response, $nextfct))

    beforeEach(() => {
      $sandbox.stub(UserManager, 'checkAuthentication').resolves($auth)
      $sandbox.stub(MicroservicesService, 'listMicroservicesEndPoint').resolves($responseApp)
      $sandbox.stub(FogService, 'getFogListEndPoint').resolves($responseFogList)
      $sandbox.stub(EdgeResourceService, 'getEdgeResource').resolves($responseEdgeRes)
    })

    it('calls MicroservicesService.listMicroservicesEndPoint and FogService.getFogListEndPoint with correct args', async () => {
      await $subject
      expect($nextfct).to.have.been.called
      expect(UserManager.checkAuthentication).to.have.been.called
      expect(FogService.getFogListEndPoint).to.have.been.called
      expect(FogService.getFogListEndPoint).to.have.been.calledWith(undefined, $auth, false, false)
      expect(MicroservicesService.listMicroservicesEndPoint).to.have.been.called
      expect(MicroservicesService.listMicroservicesEndPoint).to.have.been.calledWith({ applicationName: $name, flowId: undefined }, $auth, false)
      expect(EdgeResourceService.getEdgeResource).to.not.have.been.called
    })

    context('Variables substitution and filter findAgent', () => {
      def('body', () => ({
        body: {
          name: $name,
          description: '{{ self.name | upcase }}',
          serviceredisURL: '{% assign redismsvc = microservices | where: \"name\", \"redis\" | first %}{{ redismsvc | findAgent: agents | map: \"host\"}}:{{ redismsvc | map: \"ports\" | first | first |map: \"external\" | first }}',
          videoURL: '{{ microservices | where: \"name\", \"objdetecv4\" | first | map: \"env\" | first | where: \"key\" , \"RES_URL\" | first | map: \"value\" | first }}',

        },
      }))
      def('responseApp', ({ 
        microservices: [
          {
          "name": "objdetecv4",
          "applicationId": 1,
          "ports": [
              {
                  "internal": 8080,
                  "external": 8091,
                  "publicMode": false
              }
          ],
          "env": [
              {
                  "key": "RES_URL",
                  "value": "http://mycam/img/video.mjpeg"
              }
          ]
        },
        {
          "name": "redis",
          "iofogUuid": "TkLh8wzcxb86CRnHQyJkx6VF468JFd4f",
          "ports": [
              {
                  "internal": 6379,
                  "external": 6379,
                  "publicMode": false
              }
          ],
          "application": "main-app",
          "flowId": 1
        }
      ]
      }))
      def('responseFogList', ({ 
        fogs: [
          {
            "uuid": "TkLh8wzcxb86CRnHQyJkx6VF468JFd4f",
            "name": "agent01",
            "location": "building01manager",
            "host": "myhost01",
        }
        ]
      }))

      it('performs variable substitutions and applies filter', async () => {
        await $subject
        expect($nextfct).to.have.been.called
        expect(UserManager.checkAuthentication).to.have.been.called
        expect(FogService.getFogListEndPoint).to.have.been.called
        expect(FogService.getFogListEndPoint).to.have.been.calledWith(undefined, $auth, false, false)
        expect(MicroservicesService.listMicroservicesEndPoint).to.have.been.called
        expect(MicroservicesService.listMicroservicesEndPoint).to.have.been.calledWith({ applicationName: $name, flowId: undefined }, $auth, false)
        expect(EdgeResourceService.getEdgeResource).to.not.have.been.called

        expect($req.body.serviceredisURL).to.be.equal("myhost01:6379")
        expect($req.body.videoURL).to.be.equal("http://mycam/img/video.mjpeg")
      })
    })

    context('Variables substitution and filter edgeresource', () => {
      def('responseApp', ({ 
        microservices: [
          {
          "name": "objdetecv4",
          "applicationId": 1,
          "ports": [
              {
                  "internal": 8080,
                  "external": 8091,
                  "publicMode": false
              }
          ],
          "env": [
              {
                  "key": "RES_URL",
                  "value": "http://mycam/img/video.mjpeg"
              }
          ]
        },
        {
          "name": "redis",
          "iofogUuid": "TkLh8wzcxb86CRnHQyJkx6VF468JFd4f",
          "ports": [
              {
                  "internal": 6379,
                  "external": 6379,
                  "publicMode": false
              }
          ],
          "application": "main-app",
          "flowId": 1
        }
      ]
      }))
      def('responseFogList', ({ 
        fogs: [
          {
            "uuid": "TkLh8wzcxb86CRnHQyJkx6VF468JFd4f",
            "name": "agent01",
            "location": "building01manager",
            "host": "myhost01",
        }
        ]
      }))

      context('edgeresource finding with version', () => {
        def('body', () => ({
          body: {
            name: $name,
            description: '{{ self.name | upcase }}',
            edgeRes: '{{ \"edgeRes\" | findEdgeResource: "0.1.0" | json }}'
          },
        }))
        it('performs variable substitutions and applies filter, looking edge resource with version', async () => {
          await $subject
          expect($nextfct).to.have.been.called
          expect(UserManager.checkAuthentication).to.have.been.called
          expect(FogService.getFogListEndPoint).to.have.been.called
          expect(FogService.getFogListEndPoint).to.have.been.calledWith(undefined, $auth, false, false)
          expect(MicroservicesService.listMicroservicesEndPoint).to.have.been.called
          expect(MicroservicesService.listMicroservicesEndPoint).to.have.been.calledWith({ applicationName: $name, flowId: undefined }, $auth, false)
          expect(EdgeResourceService.getEdgeResource).to.have.been.called
          expect(EdgeResourceService.getEdgeResource).to.have.been.calledWith({ name: "edgeRes", version: "0.1.0" } , $auth)
  
          expect($req.body.edgeRes).to.be.equal(JSON.stringify($responseEdgeRes))
        })
      })

      context('edgeresource finding without version', () => {
        def('body', () => ({
          body: {
            name: $name,
            description: '{{ self.name | upcase }}',
            edgeResWithoutVersion: '{{ \"edgeRes\" | findEdgeResource | json }}'
          },
        }))
        it('performs variable substitutions and applies filter, looking edge resource without version', async () => {
          await $subject
          expect($nextfct).to.have.been.called
          expect(UserManager.checkAuthentication).to.have.been.called
          expect(FogService.getFogListEndPoint).to.have.been.called
          expect(FogService.getFogListEndPoint).to.have.been.calledWith(undefined, $auth, false, false)
          expect(MicroservicesService.listMicroservicesEndPoint).to.have.been.called
          expect(MicroservicesService.listMicroservicesEndPoint).to.have.been.calledWith({ applicationName: $name, flowId: undefined }, $auth, false)
          expect(EdgeResourceService.getEdgeResource).to.have.been.called
          expect(EdgeResourceService.getEdgeResource).to.have.been.calledWith({ name: "edgeRes", version: undefined } , $auth)
  
          expect($req.body.edgeResWithoutVersion).to.be.equal(JSON.stringify($responseEdgeRes))
        })
      })
    })
  })
})
