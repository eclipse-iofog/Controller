'use strict'

const { expect } = require('chai')
const sinon = require('sinon')

const config = require('../../../src/config')
const flavor = require('../../../src/config/flavor')

describe('flavor', () => {
  def('sandbox', () => sinon.createSandbox())

  afterEach(() => {
    delete process.env.CONTROLLER_DISTRIBUTION
    delete process.env.COMPONENT_LABEL_DOMAIN
    $sandbox.restore()
  })

  function stubFlavorConfig ({ distribution, componentLabelDomain } = {}) {
    $sandbox.stub(config, 'get').callsFake((key) => {
      if (key === 'flavor.distribution') {
        return distribution
      }
      if (key === 'flavor.componentLabelDomain') {
        return componentLabelDomain
      }
      return undefined
    })
  }

  describe('.getComponentLabelKey()', () => {
    it('returns datasance.com/component when distribution is datasance', () => {
      stubFlavorConfig({ distribution: 'datasance' })
      expect(flavor.getComponentLabelKey()).to.equal('datasance.com/component')
    })

    it('returns iofog.org/component when distribution is iofog', () => {
      stubFlavorConfig({ distribution: 'iofog' })
      expect(flavor.getComponentLabelKey()).to.equal('iofog.org/component')
    })

    it('returns iofog.org/component when distribution is unset', () => {
      stubFlavorConfig()
      expect(flavor.getComponentLabelKey()).to.equal('iofog.org/component')
    })

    it('prefers CONTROLLER_DISTRIBUTION env over config', () => {
      stubFlavorConfig({ distribution: 'datasance' })
      process.env.CONTROLLER_DISTRIBUTION = 'iofog'
      expect(flavor.getComponentLabelKey()).to.equal('iofog.org/component')
    })

    it('prefers COMPONENT_LABEL_DOMAIN env over distribution', () => {
      stubFlavorConfig({ distribution: 'datasance' })
      process.env.COMPONENT_LABEL_DOMAIN = 'custom.example/component'
      expect(flavor.getComponentLabelKey()).to.equal('custom.example/component')
    })

    it('prefers flavor.componentLabelDomain config over distribution', () => {
      stubFlavorConfig({ distribution: 'datasance', componentLabelDomain: 'override.example/component' })
      expect(flavor.getComponentLabelKey()).to.equal('override.example/component')
    })
  })
})
