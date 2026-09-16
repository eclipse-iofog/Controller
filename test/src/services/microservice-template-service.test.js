'use strict'

const { expect } = require('chai')
const sinon = require('sinon')

const MicroserviceTemplateManager = require('../../../src/data/managers/microservice-template-manager')
const MicroserviceTemplateVariableManager = require('../../../src/data/managers/microservice-template-variable-manager')
const MicroserviceTemplateService = require('../../../src/services/microservice-template-service')
const Errors = require('../../../src/helpers/errors')

describe('Microservice Template Service', () => {
  def('sandbox', () => sinon.createSandbox())
  const transaction = {}

  afterEach(() => {
    $sandbox.restore()
  })

  function templateSpec () {
    return {
      images: [{ containerImage: 'nginx:alpine', archId: 1 }],
      registryId: 1,
      commands: ['nginx', '-g', 'daemon off;'],
      env: [{ key: 'PORT', value: '{{ port }}' }],
      models: {
        bindPath: '/models',
        permissions: 'ro',
        items: [{ name: 'test-model' }]
      }
    }
  }

  function stubTemplateRow (overrides = {}) {
    return {
      id: 1,
      name: 'nginx-edge',
      description: 'nginx at the edge',
      microserviceJSON: JSON.stringify(templateSpec()),
      variables: [
        { key: 'port', description: 'listen port', defaultValue: JSON.stringify('80') }
      ],
      ...overrides
    }
  }

  describe('.createMicroserviceTemplateEndpoint()', () => {
    beforeEach(() => {
      $sandbox.stub(MicroserviceTemplateManager, 'findOne').resolves(null)
      $sandbox.stub(MicroserviceTemplateManager, 'create').callsFake(async (data) => ({ id: 1, ...data }))
      $sandbox.stub(MicroserviceTemplateVariableManager, 'create').resolves()
      $sandbox.stub(MicroserviceTemplateManager, 'findOnePopulated').resolves(stubTemplateRow())
    })

    it('creates a template and strips instance identity fields', async () => {
      const result = await MicroserviceTemplateService.createMicroserviceTemplateEndpoint({
        name: 'nginx-edge',
        description: 'nginx at the edge',
        variables: [{ key: 'port', defaultValue: '80' }],
        microservice: {
          ...templateSpec(),
          name: 'should-not-store',
          application: 'should-not-store',
          iofogUuid: 'fog-uuid'
        }
      }, transaction)

      expect(result.name).to.equal('nginx-edge')
      expect(result.microservice).to.not.have.property('name')
      expect(result.microservice).to.not.have.property('application')
      expect(result.microservice).to.not.have.property('iofogUuid')
      expect(result.microservice.models.items).to.eql([{ name: 'test-model' }])
      expect(result.microservice.commands).to.eql(['nginx', '-g', 'daemon off;'])
      expect(result.variables[0].key).to.equal('port')
      expect(result.variables[0].defaultValue).to.equal('80')
      expect(MicroserviceTemplateManager.create).to.have.been.calledOnce
      expect(MicroserviceTemplateVariableManager.create).to.have.been.calledWith(
        sinon.match({
          key: 'port',
          defaultValue: JSON.stringify('80'),
          microserviceTemplateId: 1
        }),
        transaction
      )
    })

    it('rejects a duplicate template name', async () => {
      MicroserviceTemplateManager.findOne.resolves(stubTemplateRow())

      await expect(MicroserviceTemplateService.createMicroserviceTemplateEndpoint({
        name: 'nginx-edge',
        microservice: templateSpec()
      }, transaction)).to.be.rejectedWith(Errors.ConflictError, /already exists/)
    })
  })

  describe('.listMicroserviceTemplatesEndpoint() and .getMicroserviceTemplateEndpoint()', () => {
    const row = stubTemplateRow()

    beforeEach(() => {
      $sandbox.stub(MicroserviceTemplateManager, 'findAllPopulated').resolves([row])
      $sandbox.stub(MicroserviceTemplateManager, 'findOnePopulated').resolves(row)
    })

    it('lists templates with parsed microservice and variables', async () => {
      const result = await MicroserviceTemplateService.listMicroserviceTemplatesEndpoint(transaction)
      expect(result.microserviceTemplates).to.have.length(1)
      expect(result.microserviceTemplates[0].name).to.equal('nginx-edge')
      expect(result.microserviceTemplates[0].microservice.models.bindPath).to.equal('/models')
      expect(result.microserviceTemplates[0].variables[0].defaultValue).to.equal('80')
    })

    it('returns a template by name', async () => {
      const result = await MicroserviceTemplateService.getMicroserviceTemplateEndpoint('nginx-edge', transaction)
      expect(result.name).to.equal('nginx-edge')
      expect(result.microservice.commands).to.eql(['nginx', '-g', 'daemon off;'])
    })
  })

  describe('.updateMicroserviceTemplateEndpoint() and .deleteMicroserviceTemplateEndpoint()', () => {
    beforeEach(() => {
      $sandbox.stub(MicroserviceTemplateManager, 'findOnePopulated').resolves(stubTemplateRow())
      $sandbox.stub(MicroserviceTemplateManager, 'update').resolves()
      $sandbox.stub(MicroserviceTemplateManager, 'delete').resolves()
      $sandbox.stub(MicroserviceTemplateVariableManager, 'delete').resolves()
      $sandbox.stub(MicroserviceTemplateVariableManager, 'create').resolves()
    })

    it('patches description and microservice spec', async () => {
      MicroserviceTemplateManager.findOnePopulated.onSecondCall().resolves(stubTemplateRow({
        description: 'updated',
        microserviceJSON: JSON.stringify({
          images: [{ containerImage: 'nginx:stable', archId: 1 }],
          registryId: 1
        })
      }))

      const result = await MicroserviceTemplateService.updateMicroserviceTemplateEndpoint('nginx-edge', {
        description: 'updated',
        microservice: {
          images: [{ containerImage: 'nginx:stable', archId: 1 }],
          registryId: 1
        }
      }, transaction)

      expect(MicroserviceTemplateManager.update).to.have.been.calledOnce
      expect(MicroserviceTemplateVariableManager.delete).to.not.have.been.called
      expect(result.description).to.equal('updated')
      expect(result.microservice.images[0].containerImage).to.equal('nginx:stable')
    })

    it('replaces variables when they are sent on update', async () => {
      MicroserviceTemplateManager.findOnePopulated.onSecondCall().resolves(stubTemplateRow({
        variables: [
          { key: 'port', defaultValue: JSON.stringify('8080') }
        ]
      }))

      const result = await MicroserviceTemplateService.updateMicroserviceTemplateEndpoint('nginx-edge', {
        variables: [{ key: 'port', defaultValue: '8080' }]
      }, transaction)

      expect(MicroserviceTemplateVariableManager.delete).to.have.been.calledWith(
        { microserviceTemplateId: 1 },
        transaction
      )
      expect(MicroserviceTemplateVariableManager.create).to.have.been.calledOnce
      expect(result.variables[0].defaultValue).to.equal('8080')
    })

    it('deletes a template by name', async () => {
      const result = await MicroserviceTemplateService.deleteMicroserviceTemplateEndpoint('nginx-edge', transaction)
      expect(result).to.eql({})
      expect(MicroserviceTemplateManager.delete).to.have.been.calledWith({ name: 'nginx-edge' }, transaction)
    })

    it('rejects get/update/delete when the template is missing', async () => {
      MicroserviceTemplateManager.findOnePopulated.resolves(null)
      await expect(MicroserviceTemplateService.getMicroserviceTemplateEndpoint('missing', transaction))
        .to.be.rejectedWith(Errors.NotFoundError, /not found/)
    })
  })

  describe('.getMicroserviceDataFromTemplate()', () => {
    beforeEach(() => {
      $sandbox.stub(MicroserviceTemplateManager, 'findOnePopulated').resolves(stubTemplateRow())
    })

    it('substitutes variables and keeps catalog and container fields', async () => {
      const result = await MicroserviceTemplateService.getMicroserviceDataFromTemplate({
        name: 'nginx-edge',
        variables: { port: '8080' }
      }, false, transaction)

      expect(result.env).to.eql([{ key: 'PORT', value: '8080' }])
      expect(result.commands).to.eql(['nginx', '-g', 'daemon off;'])
      expect(result.models).to.eql({
        bindPath: '/models',
        permissions: 'ro',
        items: [{ name: 'test-model' }]
      })
      expect(result).to.not.have.property('name')
      expect(result).to.not.have.property('application')
      expect(result).to.not.have.property('iofogUuid')
    })

    it('uses default variable values when the deploy overlay omits them', async () => {
      const result = await MicroserviceTemplateService.getMicroserviceDataFromTemplate({
        name: 'nginx-edge'
      }, false, transaction)

      expect(result.env).to.eql([{ key: 'PORT', value: '80' }])
    })

    it('accepts application-style array variables', async () => {
      const result = await MicroserviceTemplateService.getMicroserviceDataFromTemplate({
        name: 'nginx-edge',
        variables: [{ key: 'port', value: '9090' }]
      }, false, transaction)

      expect(result.env[0].value).to.equal('9090')
    })

    it('rejects a missing template name', async () => {
      MicroserviceTemplateManager.findOnePopulated.resolves(null)
      await expect(MicroserviceTemplateService.getMicroserviceDataFromTemplate({
        name: 'missing'
      }, false, transaction)).to.be.rejectedWith(Errors.NotFoundError, /not found/)
    })
  })
})
