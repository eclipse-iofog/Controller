const { expect } = require('chai')
const sinon = require('sinon')

const { substitutionMiddleware } = require('../../../src/helpers/template-helper')
const MicroservicesService = require('../../../src/services/microservices-service')
const ApplicationManager = require('../../../src/data/managers/application-manager')
const FogService = require('../../../src/services/iofog-service')

describe('rvaluesVarSubstitionMiddleware', () => {
  def('subject', () => substitutionMiddleware)
  def('sandbox', () => sinon.createSandbox())

  afterEach(() => $sandbox.restore())

  context('GET request method not calling microservices and fog list services', () => {
    def('name', () => 'testName')

    def('req', () => ({
      method: 'GET',
      body: {
        name: $name,
      },
    }))

    def('responseApp', () => Promise.resolve())
    def('responseFogList', () => Promise.resolve())
    def('response', () => Promise.resolve())
    def('nextfct', () => sinon.spy())
    def('subject', () => $subject($req, $response, $nextfct))

    beforeEach(() => {
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
        body: {
          name: $name,
          description: '{{ self.name | upcase }}',
        },
      }))

      it('succeeds', async () => {
        await $subject
        expect($req.body.description).to.be.equal($name.toUpperCase())
      })
    })
  })

  context('POST request method triggering middleware', () => {
    def('name', () => 'testName')

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
      ...$body
    }))

    def('responseApp', () => ({
      microservices: []
    }))
    def('responseFog', () => ({}))

    def('response', () => Promise.resolve())
    def('nextfct', () => sinon.spy())
    def('subject', () => $subject($req, $response, $nextfct))

    beforeEach(() => {
      $sandbox.stub(ApplicationManager, 'findOnePopulated').resolves($responseApp)
      $sandbox.stub(MicroservicesService, 'listMicroservicesEndPoint').resolves($responseApp)
      $sandbox.stub(FogService, 'getFogEndPoint').resolves($responseFog)
    })

    it('calls next after POST body substitution', async () => {
      await $subject
      expect($nextfct).to.have.been.called
      expect($req.body.description).to.be.equal($name.toUpperCase())
    })

    context('Variables substitution and filter findMicroserviceAgent', () => {
      def('redisAppName', () => 'redisApp')
      def('body', () => ({
        body: {
          name: $name,
          description: '{{ self.name | upcase }}',
          serviceredisURL: `{% assign redisApp = \"${$redisAppName}\" | findApplication %}{% assign redismsvc = redisApp.microservices | where: \"name\", \"redis\" | first %}{{ redismsvc | findMicroserviceAgent | map: \"host\"}}:{{ redismsvc | map: \"ports\" | first | first |map: \"external\" | first | toString }}`,
          videoURL: `{% assign redisApp = \"${$redisAppName}\" | findApplication %}{{ redisApp.microservices | where: \"name\", \"objdetecv4\" | first | map: \"env\" | first | where: \"key\" , \"RES_URL\" | first | map: \"value\" | first }}`,
        },
      }))
      def('responseApp', () => ({
        microservices: [
          {
            name: 'objdetecv4',
            applicationId: 1,
            ports: [
              {
                internal: 8080,
                external: 8091,
                publicMode: false
              }
            ],
            env: [
              {
                key: 'RES_URL',
                value: 'http://mycam/img/video.mjpeg'
              }
            ]
          },
          {
            name: 'redis',
            iofogUuid: 'TkLh8wzcxb86CRnHQyJkx6VF468JFd4f',
            ports: [
              {
                internal: 6379,
                external: 6379,
                publicMode: false
              }
            ],
            application: 'main-app',
            flowId: 1
          }
        ]
      }))
      def('responseFog', () => ({
        uuid: 'TkLh8wzcxb86CRnHQyJkx6VF468JFd4f',
        name: 'agent01',
        location: 'building01manager',
        host: 'myhost01',
      }))

      beforeEach(() => {
        const Transaction = require('sequelize/lib/transaction')
        $sandbox.matchTransaction = sinon.match.instanceOf(Transaction)
      })

      it('performs variable substitutions and applies filter', async () => {
        await $subject
        expect($nextfct).to.have.been.called
        expect(FogService.getFogEndPoint).to.have.been.called
        expect(FogService.getFogEndPoint).to.have.been.calledWith({ uuid: 'TkLh8wzcxb86CRnHQyJkx6VF468JFd4f' }, false)
        expect(ApplicationManager.findOnePopulated).to.have.been.calledOnce
        expect(ApplicationManager.findOnePopulated).to.have.been.calledWith(
          { exclude: ['created_at', 'updated_at'] },
          $sandbox.matchTransaction
        )
        expect(MicroservicesService.listMicroservicesEndPoint).to.have.been.called
        expect(MicroservicesService.listMicroservicesEndPoint).to.have.been.calledWith({ applicationName: $redisAppName }, false)

        expect($req.body.serviceredisURL).to.be.equal('myhost01:6379')
        expect($req.body.videoURL).to.be.equal('http://mycam/img/video.mjpeg')
      })
    })
  })
})
