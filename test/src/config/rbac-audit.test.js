'use strict'

const fs = require('fs')
const path = require('path')
const { expect } = require('chai')
const yaml = require('js-yaml')
const { auditRbac } = require('../../../scripts/rbac-audit')

const CATALOG_PATH = path.join(__dirname, '../../../src/config/rbac-resources.yaml')

describe('RBAC route catalog', () => {
  it('registers every live Express route in rbac-resources.yaml', () => {
    const result = auditRbac()
    expect(result.gaps, JSON.stringify(result.gaps, null, 2)).to.deep.equal([])
    expect(result.banned).to.deep.equal([])
    expect(result.missing).to.deep.equal([])
  })

  it('registers fleet model, RuntimeClass, and microservice template routes', () => {
    const catalog = yaml.load(fs.readFileSync(CATALOG_PATH, 'utf8'))

    expect(catalog.resources.models).to.be.an('object')
    expect(catalog.resources.runtimeClasses).to.be.an('object')
    expect(catalog.resources.microserviceTemplates).to.be.an('object')
    expect(catalog.resources.microservices.routes.some((route) => {
      return route.path === '/api/v3/microservices/:uuid/models'
    })).to.equal(true)
    expect(catalog.resources.agent.routes.some((route) => route.path === '/api/v3/agent/models')).to.equal(true)
    expect(catalog.resources.agent.routes.some((route) => route.path === '/api/v3/agent/runtimeClasses')).to.equal(true)
  })

  it('does not leave stale yaml entries for fleet model or RuntimeClass routes', () => {
    const result = auditRbac()
    const fleetOrphans = result.orphans.filter((orphan) => {
      return orphan.resource === 'models' ||
        orphan.resource === 'runtimeClasses' ||
        orphan.resource === 'microserviceTemplates' ||
        orphan.path.includes('/agent/models') ||
        orphan.path.includes('/agent/runtimeClasses') ||
        orphan.path.includes('/microservices/:uuid/models')
    })
    expect(fleetOrphans, JSON.stringify(fleetOrphans, null, 2)).to.deep.equal([])
  })
})
