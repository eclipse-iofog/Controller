'use strict'

const { expect } = require('chai')
const { versionRegex } = require('../../../src/schemas/utils/utils')

describe('schemas/utils versionRegex', () => {
  const re = new RegExp(versionRegex)

  for (const version of [
    '1.0.0',
    'v1.0.0',
    '2.0.0-rc.2',
    'v2.0.0-rc.2',
    '1.0.0-rc.10',
    'v1.0.0-rc.10',
    '1.0.0-beta.11',
    '1.0.0-alpha+001',
    '1.0.0+20130313144700',
    '1.0.0-x.7.z.92'
  ]) {
    it(`accepts ${version}`, () => {
      expect(re.test(version)).to.equal(true)
    })
  }

  for (const version of ['01.0.0', '1.0.0-rc.01', '1.0', 'not-a-version']) {
    it(`rejects ${version}`, () => {
      expect(re.test(version)).to.equal(false)
    })
  }
})
