const fs = require('fs')
const path = require('path')
const { expect } = require('chai')

describe('RuntimeClass routes', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../../../src/routes/runtimeClasses.js'), 'utf8')

  it('registers user runtime class CRUD, YAML, and link routes', () => {
    expect(source).to.include("path: '/api/v3/runtimeClasses'")
    expect(source).to.include("path: '/api/v3/runtimeClasses/:name'")
    expect(source).to.include("path: '/api/v3/runtimeClasses/yaml'")
    expect(source).to.include("path: '/api/v3/runtimeClasses/yaml/:name'")
    expect(source).to.include("path: '/api/v3/runtimeClasses/:name/link'")
    expect(source).to.include("method: 'put'")
    expect(source).to.include("method: 'patch'")
    expect(source).to.include("method: 'delete'")
    expect(source).to.include("method: 'post'")
  })
})
