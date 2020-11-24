const { expect } = require('chai')
const sinon = require('sinon')

const { rvaluesVarSubstitionMiddleware } = require('../../../src/helpers/template-helper')
const MicroservicesController = require('../../../src/controllers/microservices-controller')
const FogController = require('../../../src/controllers/iofog-controller')

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
      $sandbox.stub(MicroservicesController, 'getMicroservicesByApplicationEndPoint').returns($responseApp)
      $sandbox.stub(FogController, 'getFogListEndPoint').returns($responseFogList)
    })

    it('not calls getMicroservicesByApplicationEndPoint and getFogListEndPoint GET method', async () => {
      await $subject
      expect($nextfct).to.have.been.called
      expect(FogController.getFogListEndPoint).to.not.have.been.called
      expect(MicroservicesController.getMicroservicesByApplicationEndPoint).to.not.have.been.called
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
      headers: { authorization: $token },
      ...$body
    }))

    def('responseApp', ({ 
      microservices: []
    }))
    def('responseFogList', ({ 
      fogs: []
    }))
    def('response', () => Promise.resolve())
    def('nextfct', () => sinon.spy() )
    def('subject', () => $subject($req, $response, $nextfct))

    beforeEach(() => {
      $sandbox.stub(MicroservicesController, 'getMicroservicesByApplicationEndPoint').returns($responseApp)
      $sandbox.stub(FogController, 'getFogListEndPoint').returns($responseFogList)
    })

    it('calls MicroservicesController.getMicroservicesByApplicationEndPoint and FogController.getFogListEndPoint with correct args', async () => {
      await $subject
      expect($nextfct).to.have.been.called
      expect(FogController.getFogListEndPoint).to.have.been.called
      expect(FogController.getFogListEndPoint).to.have.been.calledWith($req)
      expect(MicroservicesController.getMicroservicesByApplicationEndPoint).to.have.been.called
      expect(MicroservicesController.getMicroservicesByApplicationEndPoint).to.have.been.calledWith($req)
    })

    context('Variables substitution and filters', () => {
      def('body', () => ({
        body: {
          name: $name,
          description: '{{ self.name | upcase }}',
          serviceredisURL: '{% assign redismsvc = microservices | where: \"name\", \"redis\" | first %}{{ redismsvc | findAgent: iofogs | map: \"host\"}}:{{ redismsvc | map: \"ports\" | first | first |map: \"external\" | first }}',
          videoURL: '{{ microservices | where: \"name\", \"objdetecv4\" | first | map: \"env\" | first | where: \"key\" , \"RES_URL\" | first | map: \"value\" | first }}'
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

      it('performs variable substituions and applies filter ', async () => {
        await $subject
        expect($nextfct).to.have.been.called
        expect(FogController.getFogListEndPoint).to.have.been.called
        expect(FogController.getFogListEndPoint).to.have.been.calledWith($req)
        expect(MicroservicesController.getMicroservicesByApplicationEndPoint).to.have.been.called
        expect(MicroservicesController.getMicroservicesByApplicationEndPoint).to.have.been.calledWith($req)

        expect($req.body.serviceredisURL).to.be.equal("myhost01:6379")
        expect($req.body.videoURL).to.be.equal("http://mycam/img/video.mjpeg")
      })
    })
  })
})
