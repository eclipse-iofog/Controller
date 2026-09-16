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
        }
      })

      expect(response).to.not.have.property('entrypoint')
      expect(response).to.not.have.property('commands')
      expect(response.cmd).to.eql([])
      expect(response.models.items).to.eql([{ name: 'test-model' }])
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
