const { expect } = require('chai')
const fs = require('fs')
const path = require('path')

describe('init', () => {
  it('does not ensure central local CAs at boot', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '../../src/init.js'),
      'utf8'
    )

    expect(source).to.not.include('ensureCentralLocalCAs')
    expect(source).to.not.match(/Ensuring central router and NATS local CAs/)
  })
})
