const fs = require('fs')
const path = require('path')
const { expect } = require('chai')

describe('Microservice template routes', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../../../src/routes/microserviceTemplates.js'), 'utf8')

  it('registers template CRUD and YAML routes', () => {
    expect(source).to.include("path: '/api/v3/microserviceTemplates'")
    expect(source).to.include("path: '/api/v3/microserviceTemplates/:name'")
    expect(source).to.include("path: '/api/v3/microserviceTemplates/yaml'")
    expect(source).to.include("path: '/api/v3/microserviceTemplates/yaml/:name'")
    expect(source).to.include("method: 'put'")
    expect(source).to.include("method: 'patch'")
    expect(source).to.include("method: 'delete'")
    expect(source).to.include("method: 'post'")
  })
})
