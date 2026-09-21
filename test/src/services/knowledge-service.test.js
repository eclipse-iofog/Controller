'use strict'

const { expect } = require('chai')
const sinon = require('sinon')

const FleetKnowledgeManager = require('../../../src/data/managers/fleet-knowledge-manager')
const FleetModelManager = require('../../../src/data/managers/fleet-model-manager')
const RegistryManager = require('../../../src/data/managers/registry-manager')
const MicroserviceManager = require('../../../src/data/managers/microservice-manager')
const MicroserviceKnowledgeItemManager = require('../../../src/data/managers/microservice-knowledge-item-manager')
const FogManager = require('../../../src/data/managers/iofog-manager')
const ChangeTrackingService = require('../../../src/services/change-tracking-service')
const KnowledgeService = require('../../../src/services/knowledge-service')
const { normalizeKnowledgeFormat } = require('../../../src/helpers/knowledge-format')
const AppHelper = require('../../../src/helpers/app-helper')
const Errors = require('../../../src/helpers/errors')

describe('Knowledge Service', () => {
  def('sandbox', () => sinon.createSandbox())
  const transaction = {}
  const knowledgeUuid = '3f2c1111-2222-3333-4444-555566667777'
  const fogUuid = 'fog-1'

  afterEach(() => {
    $sandbox.restore()
  })

  function stubKnowledgeRow (overrides = {}) {
    return {
      uuid: knowledgeUuid,
      name: 'product-docs',
      repo: 'acme/product-manuals',
      revision: '',
      registryId: 3,
      files: ['data/**/*.jsonl'],
      format: 'jsonl',
      getFogs: $sandbox.stub().resolves([]),
      ...overrides
    }
  }

  describe('format mapping', () => {
    it('lowercases a known token and stores unknown for anything else', () => {
      expect(normalizeKnowledgeFormat('JSONL')).to.equal('jsonl')
      expect(normalizeKnowledgeFormat('PDF')).to.equal('pdf')
      expect(normalizeKnowledgeFormat('docx')).to.equal('unknown')
      expect(normalizeKnowledgeFormat('gguf')).to.equal('unknown')
      expect(normalizeKnowledgeFormat('txt')).to.equal('unknown')
      expect(normalizeKnowledgeFormat('Markdown ')).to.equal('unknown')
    })

    it('leaves an omitted, null, or empty format unset', () => {
      expect(normalizeKnowledgeFormat(undefined)).to.equal(null)
      expect(normalizeKnowledgeFormat(null)).to.equal(null)
      expect(normalizeKnowledgeFormat('')).to.equal(null)
    })
  })

  describe('.createKnowledgeEndpoint()', () => {
    beforeEach(() => {
      $sandbox.stub(AppHelper, 'generateUUID').returns(knowledgeUuid)
      $sandbox.stub(FleetKnowledgeManager, 'findOne').resolves(null)
      $sandbox.stub(FleetKnowledgeManager, 'create').callsFake(async (data) => data)
      $sandbox.stub(RegistryManager, 'findOne').resolves({ id: 3, type: 'hf' })
    })

    it('persists a Hugging Face artifact with lowercase format and a server uuid', async () => {
      const result = await KnowledgeService.createKnowledgeEndpoint({
        name: 'product-docs',
        repo: 'acme/product-manuals',
        registryId: 3,
        files: ['data/**/*.jsonl'],
        format: 'JSONL'
      }, transaction)

      expect(result).to.eql({
        uuid: knowledgeUuid,
        name: 'product-docs',
        repo: 'acme/product-manuals',
        revision: '',
        registryId: 3,
        files: ['data/**/*.jsonl'],
        format: 'jsonl'
      })
      expect(FleetKnowledgeManager.create).to.have.been.calledWith(
        sinon.match({ uuid: knowledgeUuid, format: 'jsonl' }),
        transaction
      )
    })

    it('stores unknown for an unrecognized format and does not reject the request', async () => {
      for (const format of ['docx', 'gguf', 'txt']) {
        FleetKnowledgeManager.create.resetHistory()
        const result = await KnowledgeService.createKnowledgeEndpoint({
          name: 'product-docs',
          repo: 'acme/product-manuals',
          registryId: 3,
          format
        }, transaction)
        expect(result.format).to.equal('unknown')
      }
    })

    it('omits format when the field is left out', async () => {
      const result = await KnowledgeService.createKnowledgeEndpoint({
        name: 'product-docs',
        repo: 'acme/product-manuals',
        registryId: 3,
        files: ['data/**/*.jsonl']
      }, transaction)

      expect(result).to.not.have.property('format')
      expect(FleetKnowledgeManager.create).to.have.been.calledWith(
        sinon.match({ format: null }),
        transaction
      )
    })

    it('rejects non-empty files on an OCI registry', async () => {
      RegistryManager.findOne.resolves({ id: 1, type: 'oci' })

      await expect(KnowledgeService.createKnowledgeEndpoint({
        name: 'oci-docs',
        repo: 'acme/manuals',
        registryId: 1,
        files: ['index.md']
      }, transaction)).to.be.rejectedWith(Errors.ValidationError, /must not specify files/)
      expect(FleetKnowledgeManager.create).to.not.have.been.called
    })

    it('accepts an OCI registry when files are empty or omitted', async () => {
      RegistryManager.findOne.resolves({ id: 1, type: 'oci' })

      const withEmpty = await KnowledgeService.createKnowledgeEndpoint({
        name: 'oci-docs',
        repo: 'acme/manuals',
        registryId: 1,
        files: []
      }, transaction)
      expect(withEmpty.files).to.eql([])
      expect(withEmpty).to.not.have.property('format')

      const omitted = await KnowledgeService.createKnowledgeEndpoint({
        name: 'oci-docs',
        repo: 'acme/manuals',
        registryId: 1
      }, transaction)
      expect(omitted.files).to.eql([])
    })

    it('rejects a duplicate knowledge name', async () => {
      FleetKnowledgeManager.findOne.resolves(stubKnowledgeRow())

      await expect(KnowledgeService.createKnowledgeEndpoint({
        name: 'product-docs',
        repo: 'acme/product-manuals',
        registryId: 3
      }, transaction)).to.be.rejectedWith(Errors.ConflictError, /already exists/)
    })

    it('allows a knowledge name that already belongs to a model', async () => {
      $sandbox.stub(FleetModelManager, 'findOne').resolves({ name: 'product-docs', uuid: 'model-uuid' })

      const result = await KnowledgeService.createKnowledgeEndpoint({
        name: 'product-docs',
        repo: 'acme/product-manuals',
        registryId: 3,
        files: ['data/**/*.jsonl'],
        format: 'jsonl'
      }, transaction)

      expect(result.name).to.equal('product-docs')
      expect(result.uuid).to.equal(knowledgeUuid)
      expect(FleetModelManager.findOne).to.not.have.been.called
      expect(FleetKnowledgeManager.create).to.have.been.calledOnce
    })
  })

  describe('.getKnowledgeEndpoint() and .getKnowledgeLinkEndpoint()', () => {
    beforeEach(() => {
      $sandbox.stub(FleetKnowledgeManager, 'findOne').resolves(stubKnowledgeRow({
        getFogs: $sandbox.stub().resolves([{ uuid: fogUuid }]),
        fogUuids: [fogUuid]
      }))
    })

    it('returns the artifact spec without linked fogs', async () => {
      const row = await FleetKnowledgeManager.findOne()
      const result = await KnowledgeService.getKnowledgeEndpoint('product-docs', transaction)
      expect(result).to.eql({
        uuid: knowledgeUuid,
        name: 'product-docs',
        repo: 'acme/product-manuals',
        revision: '',
        registryId: 3,
        files: ['data/**/*.jsonl'],
        format: 'jsonl'
      })
      expect(result).to.not.have.property('fogUuids')
      expect(result).to.not.have.property('fogs')
      expect(row.getFogs).to.not.have.been.called
    })

    it('returns linked fog uuids from the link endpoint', async () => {
      const result = await KnowledgeService.getKnowledgeLinkEndpoint('product-docs', transaction)
      expect(result).to.eql({ fogUuids: [fogUuid] })
    })
  })

  describe('.updateKnowledgeEndpoint()', () => {
    beforeEach(() => {
      $sandbox.stub(FleetKnowledgeManager, 'findOne').resolves(stubKnowledgeRow())
      $sandbox.stub(FleetKnowledgeManager, 'update').resolves()
      $sandbox.stub(RegistryManager, 'findOne').resolves({ id: 3, type: 'hf' })
      $sandbox.stub(ChangeTrackingService, 'update').resolves()
    })

    it('rejects a name change because the name is immutable', async () => {
      await expect(KnowledgeService.updateKnowledgeEndpoint('product-docs', {
        name: 'renamed-docs',
        repo: 'acme/other'
      }, transaction)).to.be.rejectedWith(Errors.ValidationError, /not allowed/)
      expect(FleetKnowledgeManager.update).to.not.have.been.called
    })

    it('updates spec fields without writing the name', async () => {
      await KnowledgeService.updateKnowledgeEndpoint('product-docs', {
        revision: 'main',
        files: ['index/faiss.index']
      }, transaction)

      const patch = FleetKnowledgeManager.update.firstCall.args[1]
      expect(patch).to.not.have.property('name')
      expect(patch.revision).to.equal('main')
      expect(FleetKnowledgeManager.update.firstCall.args[0]).to.eql({ name: 'product-docs' })
    })
  })

  describe('.deleteKnowledgeEndpoint()', () => {
    beforeEach(() => {
      $sandbox.stub(FleetKnowledgeManager, 'findOne').resolves(stubKnowledgeRow())
      $sandbox.stub(FleetKnowledgeManager, 'delete').resolves()
      $sandbox.stub(MicroserviceKnowledgeItemManager, 'findAll').resolves([])
      $sandbox.stub(ChangeTrackingService, 'update').resolves()
    })

    it('refuses delete while a microservice binds the name and names that microservice', async () => {
      MicroserviceKnowledgeItemManager.findAll.resolves([
        { microserviceUuid: 'ms-1', name: 'product-docs' }
      ])

      await expect(KnowledgeService.deleteKnowledgeEndpoint('product-docs', transaction))
        .to.be.rejectedWith(Errors.ConflictError, /ms-1/)
      expect(FleetKnowledgeManager.delete).to.not.have.been.called
    })
  })

  describe('link and unlink', () => {
    let knowledge
    let agent

    beforeEach(() => {
      knowledge = stubKnowledgeRow()
      agent = {
        uuid: fogUuid,
        addKnowledge: $sandbox.stub().resolves(),
        removeKnowledge: $sandbox.stub().resolves()
      }
      $sandbox.stub(FleetKnowledgeManager, 'findOne').resolves(knowledge)
      $sandbox.stub(FogManager, 'findOne').resolves(agent)
      $sandbox.stub(MicroserviceManager, 'findOne')
      $sandbox.stub(MicroserviceKnowledgeItemManager, 'findAll').resolves([])
      $sandbox.stub(ChangeTrackingService, 'update').resolves()
    })

    it('links a fog and sets the knowledge change flag', async () => {
      const result = await KnowledgeService.linkKnowledgeEndpoint('product-docs', [fogUuid], transaction)
      expect(agent.addKnowledge).to.have.been.calledWith(knowledge, { transaction })
      expect(ChangeTrackingService.update).to.have.been.calledWith(
        fogUuid,
        ChangeTrackingService.events.knowledge,
        transaction
      )
      expect(result.name).to.equal('product-docs')
      expect(result).to.not.have.property('fogUuids')
    })

    it('refuses unlink while a microservice on that fog binds the name', async () => {
      MicroserviceKnowledgeItemManager.findAll.resolves([
        { microserviceUuid: 'ms-bound', name: 'product-docs' }
      ])
      MicroserviceManager.findOne.resolves({
        uuid: 'ms-bound',
        iofogUuid: fogUuid
      })

      await expect(KnowledgeService.unlinkKnowledgeEndpoint('product-docs', [fogUuid], transaction))
        .to.be.rejectedWith(Errors.ConflictError, /ms-bound/)
      expect(agent.removeKnowledge).to.not.have.been.called
      expect(ChangeTrackingService.update).to.not.have.been.called
    })
  })
})
