'use strict'

const { expect } = require('chai')

const CatalogContainer = require('../../../src/helpers/microservice-container-catalog')
const Errors = require('../../../src/helpers/errors')

describe('Microservice container catalog helpers', () => {
  describe('.catalogRequiresRebuild()', () => {
    const populated = {
      bindPath: '/models',
      permissions: 'ro',
      items: [{ name: 'test-model' }]
    }

    it('rebuilds empty to non-empty', () => {
      expect(CatalogContainer.catalogRequiresRebuild(null, populated)).to.equal(true)
    })

    it('rebuilds non-empty to empty', () => {
      expect(CatalogContainer.catalogRequiresRebuild(populated, { items: [] })).to.equal(true)
    })

    it('rebuilds bindPath changes', () => {
      expect(CatalogContainer.catalogRequiresRebuild(populated, {
        ...populated,
        bindPath: '/opt/models'
      })).to.equal(true)
    })

    it('rebuilds permissions changes', () => {
      expect(CatalogContainer.catalogRequiresRebuild(populated, {
        ...populated,
        permissions: 'rw'
      })).to.equal(true)
    })

    it('does not rebuild item add/remove with the same bindPath and permissions', () => {
      expect(CatalogContainer.catalogRequiresRebuild(populated, {
        bindPath: '/models',
        permissions: 'ro',
        items: [{ name: 'test-model' }, { name: 'qwen3-8-27b' }]
      })).to.equal(false)
    })
  })

  describe('.resolveProcessArgv()', () => {
    it('prefers commands over cmd', () => {
      expect(CatalogContainer.resolveProcessArgv({
        commands: ['a'],
        cmd: ['b']
      })).to.eql(['a'])
    })

    it('accepts cmd as an alias', () => {
      expect(CatalogContainer.resolveProcessArgv({ cmd: ['b'] })).to.eql(['b'])
    })
  })

  describe('.serializeArgv()', () => {
    it('omits empty arrays', () => {
      expect(CatalogContainer.serializeArgv([])).to.equal(null)
      expect(CatalogContainer.serializeArgv(undefined)).to.equal(null)
    })
  })

  describe('.validateCatalog()', () => {
    it('requires bindPath when items are present', () => {
      expect(() => CatalogContainer.validateCatalog({
        items: [{ name: 'test-model' }]
      })).to.throw(Errors.ValidationError)
    })

    it('rejects a model bindPath when there are no items', () => {
      expect(() => CatalogContainer.validateCatalog({
        bindPath: '/models',
        items: []
      })).to.throw(Errors.ValidationError, /requires at least one item/)
    })

    it('rejects a knowledge bindPath when items are omitted', () => {
      expect(() => CatalogContainer.validateCatalog({
        bindPath: '/knowledge'
      }, { kind: 'knowledge' })).to.throw(Errors.ValidationError, /requires at least one item/)
    })

    it('accepts an empty catalog without bindPath', () => {
      expect(() => CatalogContainer.validateCatalog({ items: [] })).to.not.throw()
      expect(() => CatalogContainer.validateCatalog({
        bindPath: '',
        items: []
      }, { kind: 'knowledge' })).to.not.throw()
    })

    it('rejects duplicate item names', () => {
      expect(() => CatalogContainer.validateCatalog({
        bindPath: '/models',
        items: [{ name: 'test-model' }, { name: 'test-model' }]
      })).to.throw(Errors.ValidationError)
    })

    it('rejects bindPath collisions with volumes', () => {
      expect(() => CatalogContainer.validateCatalog({
        bindPath: '/data',
        items: [{ name: 'test-model' }]
      }, {
        volumeMappings: [{ containerDestination: '/data' }]
      })).to.throw(Errors.ValidationError)
    })

    it('rejects a knowledge bindPath that matches the models catalog', () => {
      expect(() => CatalogContainer.validateCatalog({
        bindPath: '/models',
        permissions: 'ro',
        items: [{ name: 'product-docs' }]
      }, {
        kind: 'knowledge',
        otherCatalog: {
          bindPath: '/models',
          permissions: 'ro',
          items: [{ name: 'test-model' }]
        }
      })).to.throw(Errors.ValidationError, /Knowledge catalog path/)
    })

    it('rejects a knowledge item path that matches a volume destination', () => {
      expect(() => CatalogContainer.validateCatalog({
        bindPath: '/knowledge',
        items: [{ name: 'product-docs' }]
      }, {
        kind: 'knowledge',
        volumeMappings: [{ containerDestination: '/knowledge/product-docs' }]
      })).to.throw(Errors.ValidationError, /Knowledge catalog path/)
    })

    it('rejects a knowledge bindPath that matches a tmpfs mount', () => {
      expect(() => CatalogContainer.validateCatalog({
        bindPath: '/run/knowledge',
        items: [{ name: 'product-docs' }]
      }, {
        kind: 'knowledge',
        tmpfs: [{ containerPath: '/run/knowledge' }]
      })).to.throw(Errors.ValidationError, /Knowledge catalog path/)
    })

    it('rejects duplicate knowledge item names', () => {
      expect(() => CatalogContainer.validateCatalog({
        bindPath: '/knowledge',
        items: [{ name: 'product-docs' }, { name: 'product-docs' }]
      }, { kind: 'knowledge' })).to.throw(Errors.ValidationError, /duplicated/)
    })
  })

  describe('.validateContainerFields()', () => {
    it('rejects runAsUser with colon when runAsGroup is set', () => {
      expect(() => CatalogContainer.validateContainerFields({
        runAsUser: '1000:1000',
        runAsGroup: '1000'
      })).to.throw(Errors.ValidationError)
    })

    it('rejects memorySwap without memoryLimit unless -1', () => {
      expect(() => CatalogContainer.validateContainerFields({
        memorySwap: 512
      })).to.throw(Errors.ValidationError)
      expect(() => CatalogContainer.validateContainerFields({
        memorySwap: -1
      })).to.not.throw()
    })

    it('rejects unknown sysctls', () => {
      expect(() => CatalogContainer.validateContainerFields({
        sysctls: { 'kernel.unprivileged_bpf_disabled': '1' }
      })).to.throw(Errors.ValidationError)
    })

    it('coerces numeric sysctl values to strings', () => {
      const data = { sysctls: { 'net.ipv4.tcp_syncookies': 1 } }
      expect(() => CatalogContainer.validateContainerFields(data)).to.not.throw()
      expect(data.sysctls['net.ipv4.tcp_syncookies']).to.equal('1')
    })

    it('rejects net sysctls when hostNetworkMode is true', () => {
      expect(() => CatalogContainer.validateContainerFields({
        hostNetworkMode: true,
        sysctls: { 'net.ipv4.tcp_syncookies': '1' }
      })).to.throw(Errors.ValidationError)
    })

    it('rejects unknown ulimit keys and scalar values', () => {
      expect(() => CatalogContainer.validateContainerFields({
        ulimits: { nofile: 1024 }
      })).to.throw(Errors.ValidationError)
      expect(() => CatalogContainer.validateContainerFields({
        ulimits: { as: { soft: 1, hard: 1 } }
      })).to.throw(Errors.ValidationError)
    })

    it('rejects hostPath devices outside /dev', () => {
      expect(() => CatalogContainer.validateContainerFields({
        devices: [{ hostPath: '/etc/passwd', containerPath: '/dev/foo' }]
      })).to.throw(Errors.ValidationError)
    })

    it('keeps a supplemental group id beside a matching or named primary group', () => {
      const numericPrimary = { supplementalGroups: [44], runAsGroup: '44' }
      expect(() => CatalogContainer.validateContainerFields(numericPrimary)).to.not.throw()
      expect(numericPrimary.supplementalGroups).to.eql([44])
      expect(numericPrimary.runAsGroup).to.equal('44')

      const namedPrimary = { supplementalGroups: [44], runAsGroup: 'render' }
      expect(() => CatalogContainer.validateContainerFields(namedPrimary)).to.not.throw()
      expect(namedPrimary.supplementalGroups).to.eql([44])
      expect(namedPrimary.runAsGroup).to.equal('render')

      const primaryOnly = { runAsGroup: 'render' }
      expect(() => CatalogContainer.validateContainerFields(primaryOnly)).to.not.throw()
      expect(primaryOnly).to.not.have.property('supplementalGroups')
    })
  })

  describe('supplemental host group ids', () => {
    const stored = (groups) => CatalogContainer.serializeContainerColumns({ supplementalGroups: groups }).supplementalGroups

    it('omits the column on create and emits an empty list', () => {
      expect(CatalogContainer.serializeContainerColumns({})).to.not.have.property('supplementalGroups')
      expect(CatalogContainer.hydrateJsonColumns({ supplementalGroups: null }).supplementalGroups).to.eql([])

      const agent = {}
      CatalogContainer.applyAgentContainerFields(agent, { supplementalGroups: null }, { devices: [] })
      expect(agent.supplementalGroups).to.eql([])
      expect(agent).to.not.have.property('devices')
    })

    it('does not rebuild when null or an empty list is already empty', () => {
      const emptyRow = { supplementalGroups: null }
      expect(CatalogContainer.supplementalGroupsRequireRebuild({ supplementalGroups: null }, emptyRow)).to.equal(false)
      expect(CatalogContainer.supplementalGroupsRequireRebuild({ supplementalGroups: [] }, emptyRow)).to.equal(false)
      expect(CatalogContainer.containerFieldsRequireRebuild({ supplementalGroups: [] }, emptyRow)).to.equal(false)
      expect(CatalogContainer.supplementalGroupsRequireRebuild({}, emptyRow)).to.equal(false)
    })

    it('stores and sends an unsorted list in ascending order', () => {
      expect(stored([993, 44])).to.equal('[44,993]')
      expect(CatalogContainer.hydrateJsonColumns({ supplementalGroups: '[44,993]' }).supplementalGroups).to.eql([44, 993])

      const agent = { uuid: 'ms' }
      CatalogContainer.applyAgentContainerFields(agent, { supplementalGroups: '[44,993]' })
      expect(agent.supplementalGroups).to.eql([44, 993])
      expect(agent).to.not.have.nested.property('container.supplementalGroups')
    })

    it('does not rebuild a reversed list and does rebuild a clear', () => {
      const existing = { supplementalGroups: '[44,993]' }
      expect(CatalogContainer.supplementalGroupsRequireRebuild({
        supplementalGroups: [993, 44]
      }, existing)).to.equal(false)
      expect(CatalogContainer.containerFieldsRequireRebuild({
        supplementalGroups: [44, 993]
      }, existing)).to.equal(false)

      expect(CatalogContainer.supplementalGroupsRequireRebuild({
        supplementalGroups: []
      }, { supplementalGroups: '[44]' })).to.equal(true)
      expect(CatalogContainer.containerFieldsRequireRebuild({
        supplementalGroups: null
      }, { supplementalGroups: '[44]' })).to.equal(true)

      const agent = {}
      CatalogContainer.applyAgentContainerFields(agent, { supplementalGroups: null })
      expect(agent.supplementalGroups).to.eql([])
    })

    it('keeps zero and the largest group id, and treats a whole JSON number as an integer', () => {
      expect(stored([0])).to.equal('[0]')
      expect(stored([4294967295])).to.equal('[4294967295]')
      expect(stored(JSON.parse('[44.0]'))).to.equal('[44]')
      expect(CatalogContainer.normalizeSupplementalGroups(JSON.parse('[44.0]'))).to.eql([44])
    })

    it('rejects duplicates, names, fractions, negatives, overlong lists, and non-arrays', () => {
      const rejected = [
        [44, 44],
        ['44'],
        ['render'],
        [44.5],
        [-1],
        Array.from({ length: 17 }, (_, index) => index),
        [4294967296],
        'render',
        { 44: true }
      ]
      for (const value of rejected) {
        expect(() => CatalogContainer.normalizeSupplementalGroups(value), JSON.stringify(value))
          .to.throw(Errors.ValidationError)
        expect(() => CatalogContainer.validateContainerFields({ supplementalGroups: value }), JSON.stringify(value))
          .to.throw(Errors.ValidationError)
      }
    })

    it('does not insert the primary group into the stored list', () => {
      expect(CatalogContainer.serializeContainerColumns({
        supplementalGroups: [44],
        runAsGroup: '44'
      })).to.include({
        supplementalGroups: '[44]',
        runAsGroup: '44'
      })
      expect(CatalogContainer.serializeContainerColumns({
        supplementalGroups: [44],
        runAsGroup: 'render'
      })).to.include({
        supplementalGroups: '[44]',
        runAsGroup: 'render'
      })
      expect(CatalogContainer.serializeContainerColumns({ runAsGroup: 'render' }))
        .to.not.have.property('supplementalGroups')
    })

    it('puts the agent key on the microservice object when the list is empty', () => {
      const agent = { uuid: 'ms', runAsGroup: '1000' }
      CatalogContainer.applyAgentContainerFields(agent, {
        runAsGroup: '1000',
        supplementalGroups: null
      })
      expect(Object.prototype.hasOwnProperty.call(agent, 'supplementalGroups')).to.equal(true)
      expect(agent.supplementalGroups).to.eql([])
      expect(agent.runAsGroup).to.equal('1000')
    })
  })

  describe('.applyAgentContainerFields()', () => {
    it('omits empty argv arrays and includes a non-empty catalog', () => {
      const response = { uuid: 'ms' }
      CatalogContainer.applyAgentContainerFields(response, {
        sysctls: null
      }, {
        cmd: [],
        entrypoint: [],
        models: {
          bindPath: '/models',
          permissions: 'ro',
          items: [{ name: 'test-model' }]
        },
        knowledge: {
          bindPath: '/knowledge',
          permissions: 'ro',
          items: [{ name: 'product-docs' }]
        }
      })

      expect(response).to.not.have.property('entrypoint')
      expect(response).to.not.have.property('commands')
      expect(response.cmd).to.eql([])
      expect(response.models.items).to.eql([{ name: 'test-model' }])
      expect(response.knowledge.items).to.eql([{ name: 'product-docs' }])
      expect(response.knowledge.items[0]).to.not.have.property('uuid')
    })

    it('emits commands from MicroserviceArgs rows', () => {
      const response = { uuid: 'ms' }
      CatalogContainer.applyAgentContainerFields(response, {}, {
        cmd: ['python', 'app.py']
      })

      expect(response.commands).to.eql(['python', 'app.py'])
      expect(response.cmd).to.eql(['python', 'app.py'])
    })
  })
})
