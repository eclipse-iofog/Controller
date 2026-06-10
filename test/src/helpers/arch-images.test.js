const { expect } = require('chai')

const {
  validateUniqueArchIds,
  validateImageMatchesFogArch,
  imagesAreEqual,
  mapYamlImagesToArchList
} = require('../../../src/helpers/arch-images')
const Errors = require('../../../src/helpers/errors')

describe('arch-images helper', () => {
  describe('validateUniqueArchIds', () => {
    it('rejects duplicate archId', () => {
      expect(() => validateUniqueArchIds([
        { archId: 1, containerImage: 'a' },
        { archId: 1, containerImage: 'b' }
      ])).to.throw(Errors.ValidationError, /Duplicate archId/)
    })
  })

  describe('validateImageMatchesFogArch', () => {
    it('requires image.archId === fog.archId', () => {
      expect(() => validateImageMatchesFogArch('ms-a', { archId: 2 }, [
        { archId: 1, containerImage: 'img' }
      ])).to.throw(Errors.ValidationError)
    })

    it('accepts matching archId', () => {
      validateImageMatchesFogArch('ms-a', { archId: 2 }, [
        { archId: 2, containerImage: 'img' }
      ])
    })
  })

  describe('imagesAreEqual', () => {
    it('compares archId and containerImage regardless of order', () => {
      expect(imagesAreEqual(
        [{ archId: 2, containerImage: 'arm' }, { archId: 1, containerImage: 'x86' }],
        [{ archId: 1, containerImage: 'x86' }, { archId: 2, containerImage: 'arm' }]
      )).to.equal(true)
    })
  })

  describe('mapYamlImagesToArchList', () => {
    it('maps all supported YAML keys', () => {
      expect(mapYamlImagesToArchList({
        amd64: 'a',
        arm64: 'b',
        riscv: 'c',
        arm: 'd'
      })).to.eql([
        { archId: 1, containerImage: 'a' },
        { archId: 2, containerImage: 'b' },
        { archId: 3, containerImage: 'c' },
        { archId: 4, containerImage: 'd' }
      ])
    })
  })
})
