'use strict'

const { expect } = require('chai')

const {
  applyVolumeMappingScope,
  isValidBindHostDestination
} = require('../../../src/helpers/volume-mapping-scope')
const Errors = require('../../../src/helpers/errors')

function volumeMapping (overrides = {}) {
  return {
    hostDestination: 'data',
    containerDestination: '/data',
    accessMode: 'rw',
    type: 'volume',
    ...overrides
  }
}

describe('volume mapping scope helper', () => {
  describe('type volume', () => {
    it('stores private when scope is omitted', () => {
      const mapping = volumeMapping()
      applyVolumeMappingScope(mapping)
      expect(mapping.scope).to.equal('private')
    })

    it('stores private when scope is empty, null, or whitespace', () => {
      for (const scope of ['', null, '   ']) {
        const mapping = volumeMapping({ scope })
        applyVolumeMappingScope(mapping)
        expect(mapping.scope).to.equal('private')
      }
    })

    it('stores lowercase shared when scope is Shared', () => {
      const mapping = volumeMapping({ scope: 'Shared' })
      applyVolumeMappingScope(mapping)
      expect(mapping.scope).to.equal('shared')
    })

    it('rejects unknown scope values', () => {
      expect(() => applyVolumeMappingScope(volumeMapping({ scope: 'Shareed' })))
        .to.throw(Errors.ValidationError, /Unknown volume mapping scope/)
    })

    it('accepts nodered-config as a volume name', () => {
      const mapping = volumeMapping({ hostDestination: 'nodered-config' })
      applyVolumeMappingScope(mapping)
      expect(mapping.hostDestination).to.equal('nodered-config')
      expect(mapping.scope).to.equal('private')
    })

    it('rejects volume names that start with a dot, underscore, or path traversal', () => {
      for (const hostDestination of ['../x', '.hidden', '_scratch']) {
        expect(() => applyVolumeMappingScope(volumeMapping({ hostDestination })))
          .to.throw(Errors.InvalidArgumentError, /invalid characters/)
      }
    })

    it('persists shared with read-only access', () => {
      const mapping = volumeMapping({ scope: 'shared', accessMode: 'ro' })
      applyVolumeMappingScope(mapping)
      expect(mapping.scope).to.equal('shared')
      expect(mapping.accessMode).to.equal('ro')
    })

    it('rejects explicit shared when the microservice is controller or system', () => {
      expect(() => applyVolumeMappingScope(volumeMapping({ scope: 'shared' }), { rejectShared: true }))
        .to.throw(Errors.ValidationError, /not allowed on controller or system/)
    })

    it('stores private on controller or system when shared is not sent', () => {
      const mapping = volumeMapping()
      applyVolumeMappingScope(mapping, { rejectShared: true })
      expect(mapping.scope).to.equal('private')
    })
  })

  describe('type bind', () => {
    it('accepts absolute unix and windows host paths', () => {
      for (const hostDestination of ['/var/lib/data', 'C:\\data\\app']) {
        expect(isValidBindHostDestination(hostDestination)).to.equal(true)
        const mapping = volumeMapping({
          type: 'bind',
          hostDestination,
          scope: 'shared'
        })
        applyVolumeMappingScope(mapping)
        expect(mapping.scope).to.equal('private')
      }
    })

    it('rejects relative host paths and volume-style names on bind', () => {
      for (const hostDestination of ['relative/path', 'nodered-config', '../x']) {
        expect(isValidBindHostDestination(hostDestination)).to.equal(false)
        expect(() => applyVolumeMappingScope(volumeMapping({ type: 'bind', hostDestination })))
          .to.throw(Errors.InvalidArgumentError, /absolute host path/)
      }
    })
  })

  describe('non-volume types', () => {
    it('stores private when type is omitted and scope is shared', () => {
      const mapping = volumeMapping({ type: undefined, scope: 'shared' })
      applyVolumeMappingScope(mapping)
      expect(mapping.scope).to.equal('private')
    })

    it('stores private and does not reject shared on volumeMount or serviceAccount', () => {
      for (const type of ['volumeMount', 'serviceAccount']) {
        const mapping = volumeMapping({ type, scope: 'shared' })
        applyVolumeMappingScope(mapping)
        expect(mapping.scope).to.equal('private')
      }
    })
  })
})
