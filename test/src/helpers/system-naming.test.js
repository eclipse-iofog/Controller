const { expect } = require('chai')

const { slugifyName } = require('../../../src/helpers/system-naming')

describe('System Naming Helper', () => {
  describe('.slugifyName()', () => {
    it('normalizes readable names', () => {
      expect(slugifyName('My App_Name 01')).to.eql('my-app-name-01')
    })

    it('returns default on empty values', () => {
      expect(slugifyName('   ')).to.eql('default')
    })
  })
})
