const fs = require('fs')
const path = require('path')
const { expect } = require('chai')

describe('ioFog routes', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../../../src/routes/iofog.js'), 'utf8')

  it('does not register hardware inventory user routes', () => {
    expect(source).to.not.include('/hal/')
  })
})
