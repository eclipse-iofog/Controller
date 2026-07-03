const NetworkTopologyService = require('../services/network-topology-service')

const getSummaryEndPoint = async function (req) {
  return NetworkTopologyService.getSummary(req)
}

const getRouterOverviewEndPoint = async function (req) {
  return NetworkTopologyService.getRouterOverview(req)
}

const getNatsOverviewEndPoint = async function (req) {
  return NetworkTopologyService.getNatsOverview(req)
}

const listRouterNodesEndPoint = async function (req) {
  return NetworkTopologyService.listRouterNodes(req)
}

const listNatsNodesEndPoint = async function (req) {
  return NetworkTopologyService.listNatsNodes(req)
}

const getRouterNodeEndPoint = async function (req) {
  return NetworkTopologyService.getRouterNode(req)
}

const getNatsNodeEndPoint = async function (req) {
  return NetworkTopologyService.getNatsNode(req)
}

const getRouterNodeConnectionsEndPoint = async function (req) {
  return NetworkTopologyService.getRouterNodeConnections(req)
}

const getNatsNodeConnectionsEndPoint = async function (req) {
  return NetworkTopologyService.getNatsNodeConnections(req)
}

const listRouterConnectionsEndPoint = async function (req) {
  return NetworkTopologyService.listRouterConnections(req)
}

const listNatsConnectionsEndPoint = async function (req) {
  return NetworkTopologyService.listNatsConnections(req)
}

const getRouterSubgraphEndPoint = async function (req) {
  return NetworkTopologyService.getRouterSubgraph(req)
}

const getNatsSubgraphEndPoint = async function (req) {
  return NetworkTopologyService.getNatsSubgraph(req)
}

module.exports = {
  getSummaryEndPoint,
  getRouterOverviewEndPoint,
  getNatsOverviewEndPoint,
  listRouterNodesEndPoint,
  listNatsNodesEndPoint,
  getRouterNodeEndPoint,
  getNatsNodeEndPoint,
  getRouterNodeConnectionsEndPoint,
  getNatsNodeConnectionsEndPoint,
  listRouterConnectionsEndPoint,
  listNatsConnectionsEndPoint,
  getRouterSubgraphEndPoint,
  getNatsSubgraphEndPoint
}
