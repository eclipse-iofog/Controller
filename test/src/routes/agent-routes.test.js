const fs = require('fs')
const path = require('path')
const { expect } = require('chai')

describe('Agent routes', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../../../src/routes/agent.js'), 'utf8')

  it('registers fog-token model and runtime class list routes', () => {
    expect(source).to.include("path: '/api/v3/agent/models'")
    expect(source).to.include("path: '/api/v3/agent/runtimeClasses'")
    expect(source).to.include("path: '/api/v3/agent/knowledge'")
  })

  it('does not register agent hardware inventory routes', () => {
    expect(source).to.not.include('/agent/hal/')
  })
})
