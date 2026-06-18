'use strict'

const { expect } = require('chai')
const { parseBoolean } = require('../../../src/config/parse-boolean')

describe('parse-boolean', () => {
  it('parses true-like values', () => {
    expect(parseBoolean(true)).to.equal(true)
    expect(parseBoolean('true')).to.equal(true)
    expect(parseBoolean(1)).to.equal(true)
    expect(parseBoolean('1')).to.equal(true)
  })

  it('parses false-like values', () => {
    expect(parseBoolean(false)).to.equal(false)
    expect(parseBoolean('false')).to.equal(false)
    expect(parseBoolean(0)).to.equal(false)
    expect(parseBoolean('0')).to.equal(false)
  })

  it('returns default for empty values when provided', () => {
    expect(parseBoolean(undefined, true)).to.equal(true)
    expect(parseBoolean(null, false)).to.equal(false)
    expect(parseBoolean('', true)).to.equal(true)
  })

  it('returns undefined for non-boolean values without default', () => {
    expect(parseBoolean('loopback')).to.equal(undefined)
    expect(parseBoolean(2)).to.equal(undefined)
  })

  it('returns default for non-boolean values when default provided', () => {
    expect(parseBoolean('loopback', false)).to.equal(false)
    expect(parseBoolean(2, true)).to.equal(true)
  })
})
