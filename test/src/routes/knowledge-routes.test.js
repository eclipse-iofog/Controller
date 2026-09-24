const fs = require('fs')
const path = require('path')
const { expect } = require('chai')

describe('Knowledge routes', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../../../src/routes/knowledge.js'), 'utf8')

  it('registers user knowledge CRUD, YAML, and link routes', () => {
    expect(source).to.include("path: '/api/v3/knowledge'")
    expect(source).to.include("path: '/api/v3/knowledge/:name'")
    expect(source).to.include("path: '/api/v3/knowledge/yaml'")
    expect(source).to.include("path: '/api/v3/knowledge/yaml/:name'")
    expect(source).to.include("path: '/api/v3/knowledge/:name/link'")
    expect(source).to.include("fileInput: 'knowledge'")
    expect(source).to.include("method: 'put'")
    expect(source).to.include("method: 'patch'")
    expect(source).to.include("method: 'delete'")
    expect(source).to.include("method: 'post'")
    expect(source).to.not.include('/api/v3/knowledges')
  })

  it('documents knowledge and model status clocks as Unix milliseconds', () => {
    const swagger = fs.readFileSync(path.resolve(__dirname, '../../../docs/swagger.yaml'), 'utf8')
    for (const field of ['knowledgeLastUpdate:', 'modelLastUpdate:']) {
      const blocks = swagger.split(field).slice(1)
      expect(blocks.length).to.be.at.least(1)
      for (const block of blocks) {
        expect(block.slice(0, 500)).to.match(/Unix milliseconds/)
      }
    }
  })
})
