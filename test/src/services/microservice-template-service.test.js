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

    it('creates a template and strips deploy instance fields only', async () => {
      const result = await MicroserviceTemplateService.createMicroserviceTemplateEndpoint({
        name: 'nginx-edge',
        description: 'nginx at the edge',
        variables: [{ key: 'port', defaultValue: '80' }],
        microservice: {
          ...templateSpec(),
          name: 'should-not-store',
          application: '{{ app-name }}',
          agentName: '{{ agent-name }}',
          iofogUuid: 'fog-uuid'
        }
      }, transaction)

      expect(result.name).to.equal('nginx-edge')
      const storedMicroservice = JSON.parse(MicroserviceTemplateManager.create.getCall(0).args[0].microserviceJSON)
      expect(storedMicroservice).to.not.have.property('name')
      expect(storedMicroservice.application).to.equal('{{ app-name }}')
      expect(storedMicroservice.agentName).to.equal('{{ agent-name }}')
      expect(storedMicroservice).to.not.have.property('iofogUuid')
      expect(storedMicroservice.models.items).to.eql([{ name: 'test-model' }])
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

    it('substitutes typed default values into the microservice spec', async () => {
      MicroserviceTemplateManager.findOnePopulated.resolves(stubTemplateRow({
        microserviceJSON: JSON.stringify({
          application: '{{application}}',
          agentName: '{{agent-name}}',
          registryId: '{{registry-id}}',
          schedule: '{{schedule}}',
          shmSize: '{{shm-size}}',
          natsConfig: {
            natsAccess: '{{nats-access}}',
            natsRule: '{{nats-rule}}'
          },
          models: {
            bindPath: '{{bind-path}}',
            permissions: '{{permissions}}',
            items: [
              { name: '{{model1}}' },
              { name: '{{model2}}' },
              { name: '{{model3}}' }
            ]
          },
          images: [
            { archId: 1, containerImage: '{{amd64-image}}' },
            { archId: 2, containerImage: '{{arm64-image}}' }
          ]
        }),
        variables: [
          { key: 'application', defaultValue: JSON.stringify('test-app') },
          { key: 'agent-name', defaultValue: JSON.stringify('lima') },
          { key: 'nats-access', defaultValue: JSON.stringify(true) },
          { key: 'nats-rule', defaultValue: JSON.stringify('default-user') },
          { key: 'schedule', defaultValue: JSON.stringify(50) },
          { key: 'bind-path', defaultValue: JSON.stringify('/models') },
          { key: 'permissions', defaultValue: JSON.stringify('ro') },
          { key: 'model1', defaultValue: JSON.stringify('model1') },
          { key: 'model2', defaultValue: JSON.stringify('model2') },
          { key: 'model3', defaultValue: JSON.stringify('') },
          { key: 'registry-id', defaultValue: JSON.stringify(5) },
          { key: 'arm64-image', defaultValue: JSON.stringify('dhi.io/clickhouse-server:26.7') },
          { key: 'amd64-image', defaultValue: JSON.stringify('dhi.io/clickhouse-server:26.7') },
          { key: 'shm-size', defaultValue: JSON.stringify(1024) }
        ]
      }))

      const result = await MicroserviceTemplateService.getMicroserviceDataFromTemplate({
        name: 'nginx-edge'
      }, false, transaction)

      expect(result.application).to.equal('test-app')
      expect(result.agentName).to.equal('lima')
      expect(result.registryId).to.equal(5)
      expect(result.schedule).to.equal(50)
      expect(result.shmSize).to.equal(1024)
      expect(result.natsConfig).to.eql({
        natsAccess: true,
        natsRule: 'default-user'
      })
      expect(result.models).to.eql({
        bindPath: '/models',
        permissions: 'ro',
        items: [
          { name: 'model1' },
          { name: 'model2' },
          { name: '' }
        ]
      })
      expect(result.images).to.eql([
        { archId: 1, containerImage: 'dhi.io/clickhouse-server:26.7' },
        { archId: 2, containerImage: 'dhi.io/clickhouse-server:26.7' }
      ])
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
