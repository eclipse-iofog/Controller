const fs = require('fs')
const path = require('path')
const { expect } = require('chai')

describe('Microservice routes', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../../../src/routes/microservices.js'), 'utf8')

  it('registers catalog-only PATCH on a microservice', () => {
    expect(source).to.include("path: '/api/v3/microservices/:uuid/models'")
    expect(source).to.include('updateMicroserviceCatalogEndPoint')
    expect(source).to.include("path: '/api/v3/microservices/:uuid/knowledge'")
    expect(source).to.include('updateMicroserviceKnowledgeEndPoint')
    expect(source).to.not.include("path: '/api/v3/microservices/system/:uuid/knowledge'")
  })
})
