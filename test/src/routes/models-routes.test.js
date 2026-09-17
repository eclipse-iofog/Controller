const fs = require('fs')
const path = require('path')
const { expect } = require('chai')

describe('Model routes', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../../../src/routes/models.js'), 'utf8')

  it('registers user model CRUD, YAML, and link routes', () => {
    expect(source).to.include("path: '/api/v3/models'")
    expect(source).to.include("path: '/api/v3/models/:name'")
    expect(source).to.include("path: '/api/v3/models/yaml'")
    expect(source).to.include("path: '/api/v3/models/yaml/:name'")
    expect(source).to.include("path: '/api/v3/models/:name/link'")
    expect(source).to.include("method: 'put'")
    expect(source).to.include("method: 'patch'")
    expect(source).to.include("method: 'delete'")
    expect(source).to.include("method: 'post'")
  })
})
