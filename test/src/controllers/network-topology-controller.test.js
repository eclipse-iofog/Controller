const { expect } = require('chai')
const sinon = require('sinon')

const NetworkTopologyController = require('../../../src/controllers/network-topology-controller')
const NetworkTopologyService = require('../../../src/services/network-topology-service')

describe('Network Topology Controller', () => {
  def('subject', () => NetworkTopologyController)
  def('sandbox', () => sinon.createSandbox())

  afterEach(() => $sandbox.restore())

  it('getSummaryEndPoint delegates to service', async () => {
    const summary = { controlPlane: 'remote' }
    $sandbox.stub(NetworkTopologyService, 'getSummary').resolves(summary)
    await expect($subject.getSummaryEndPoint({})).to.eventually.eql(summary)
    expect(NetworkTopologyService.getSummary).to.have.been.calledOnce
  })

  it('listRouterNodesEndPoint delegates to service', async () => {
    const req = { query: { limit: '10' } }
    const payload = { nodes: [], total: 0, limit: 10, offset: 0 }
    $sandbox.stub(NetworkTopologyService, 'listRouterNodes').resolves(payload)
    await expect($subject.listRouterNodesEndPoint(req)).to.eventually.eql(payload)
    expect(NetworkTopologyService.listRouterNodes).to.have.been.calledOnceWith(req)
  })
})
