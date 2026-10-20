const { expect } = require('chai')
const sinon = require('sinon')
const fs = require('fs')
const { Liquid } = require('../../../src/lib/liquidjs/liquid.node.cjs')

const {
  renderRequestTemplates,
  authorizedSubstitutionMiddleware
} = require('../../../src/helpers/template-helper')
const MicroservicesService = require('../../../src/services/microservices-service')
const ApplicationManager = require('../../../src/data/managers/application-manager')
const FogService = require('../../../src/services/iofog-service')

function mockResponse () {
  return {
    statusCode: null,
    body: null,
    status (code) {
      this.statusCode = code
      return this
    },
    json (payload) {
      this.body = payload
      return this
    }
  }
}

describe('rvalues variable substitution', () => {
  def('sandbox', () => sinon.createSandbox())

  afterEach(() => $sandbox.restore())

  context('direct render', () => {
    def('name', () => 'testName')

    beforeEach(() => {
      $sandbox.stub(MicroservicesService, 'listMicroservicesEndPoint').resolves({ microservices: [] })
      $sandbox.stub(FogService, 'getFogListEndPoint').resolves({ fogs: [] })
      $sandbox.stub(FogService, 'getFogEndPoint').resolves({})
      $sandbox.stub(ApplicationManager, 'findOnePopulated').resolves({ microservices: [] })
    })

    it('does not call lookup services for a GET body', async () => {
      const req = {
        method: 'GET',
        body: { name: $name }
      }
      await renderRequestTemplates(req)
      expect(FogService.getFogListEndPoint).to.not.have.been.called
      expect(MicroservicesService.listMicroservicesEndPoint).to.not.have.been.called
      expect(req.body.name).to.equal($name)
    })

    it('expands a normal POST template', async () => {
      const req = {
        method: 'POST',
        body: {
          name: $name,
          description: '{{ self.name | upcase }}'
        }
      }
      await renderRequestTemplates(req)
      expect(req.body.description).to.equal($name.toUpperCase())
    })

    it('applies findApplication and findMicroserviceAgent when managers are stubbed', async () => {
      const redisAppName = 'redisApp'
      const responseApp = {
        microservices: [
          {
            name: 'objdetecv4',
            applicationId: 1,
            ports: [{ internal: 8080, external: 8091, publicMode: false }],
            env: [{ key: 'RES_URL', value: 'http://mycam/img/video.mjpeg' }]
          },
          {
            name: 'redis',
            iofogUuid: 'TkLh8wzcxb86CRnHQyJkx6VF468JFd4f',
            ports: [{ internal: 6379, external: 6379, publicMode: false }]
          }
        ]
      }
      ApplicationManager.findOnePopulated.resolves(responseApp)
      MicroservicesService.listMicroservicesEndPoint.resolves(responseApp)
      FogService.getFogEndPoint.resolves({
        uuid: 'TkLh8wzcxb86CRnHQyJkx6VF468JFd4f',
        host: 'myhost01'
      })

      const req = {
        method: 'POST',
        body: {
          name: $name,
          serviceredisURL: `{% assign redisApp = "${redisAppName}" | findApplication %}{% assign redismsvc = redisApp.microservices | where: "name", "redis" | first %}{{ redismsvc | findMicroserviceAgent | map: "host" }}:{{ redismsvc | map: "ports" | first | first | map: "external" | first | toString }}`,
          videoURL: `{% assign redisApp = "${redisAppName}" | findApplication %}{{ redisApp.microservices | where: "name", "objdetecv4" | first | map: "env" | first | where: "key", "RES_URL" | first | map: "value" | first }}`
        }
      }

      await renderRequestTemplates(req)

      expect(FogService.getFogEndPoint).to.have.been.calledWith(
        { uuid: 'TkLh8wzcxb86CRnHQyJkx6VF468JFd4f' },
        false
      )
      expect(MicroservicesService.listMicroservicesEndPoint).to.have.been.calledWith(
        { applicationName: redisAppName },
        false
      )
      expect(req.body.serviceredisURL).to.equal('myhost01:6379')
      expect(req.body.videoURL).to.equal('http://mycam/img/video.mjpeg')
    })
  })

  context('route gate', () => {
    beforeEach(() => {
      $sandbox.stub(MicroservicesService, 'listMicroservicesEndPoint').resolves({ microservices: [] })
      $sandbox.stub(FogService, 'getFogListEndPoint').resolves({ fogs: [] })
    })

    it('does not render a POST without a verified principal', async () => {
      const req = {
        method: 'POST',
        path: '/api/v3/registries',
        body: {
          name: 'testName',
          url: '{{ "" | findAgent | size }}'
        }
      }
      const res = mockResponse()
      const next = sinon.spy()

      await authorizedSubstitutionMiddleware(req, res, next)

      expect(next).to.not.have.been.called
      expect(res.statusCode).to.equal(401)
      expect(req.body.url).to.equal('{{ "" | findAgent | size }}')
      expect(FogService.getFogListEndPoint).to.not.have.been.called
      expect(MicroservicesService.listMicroservicesEndPoint).to.not.have.been.called
    })
  })

  context('engine limits', () => {
    it('throws when a range is wider than 10000', async () => {
      const engine = new Liquid()
      try {
        await engine.parseAndRender('{{ (1..10001) | size }}')
        expect.fail('expected an oversized range to throw')
      } catch (error) {
        expect(error.message).to.match(/10000/)
      }
    })

    it('still renders a small range', async () => {
      const engine = new Liquid()
      const rendered = await engine.parseAndRender('{{ (1..3) | size }}')
      expect(Number(rendered)).to.equal(3)
    })

    it('does not read the filesystem for an include', async () => {
      const readFileSync = $sandbox.spy(fs, 'readFileSync')
      const req = {
        method: 'POST',
        body: { note: "{% include 'package.json' %}" }
      }

      await renderRequestTemplates(req)

      expect(readFileSync).to.not.have.been.called
      expect(req.body.note).to.be.a('string')
      expect(req.body.note).to.not.match(/"dependencies"/)
    })
  })
})
