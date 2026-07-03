const config = require('../config')
const Constants = require('../helpers/constants')
const Errors = require('../helpers/errors')
const RouterManager = require('../data/managers/router-manager')
const RouterConnectionManager = require('../data/managers/router-connection-manager')
const NatsInstanceManager = require('../data/managers/nats-instance-manager')
const NatsConnectionManager = require('../data/managers/nats-connection-manager')
const FogManager = require('../data/managers/iofog-manager')
const TransactionDecorator = require('../decorators/transaction-decorator')
const Validator = require('../schemas')
const { Op } = require('sequelize')

function _routerModel () {
  return RouterManager.getEntity()
}

function _routerConnectionModel () {
  return RouterConnectionManager.getEntity()
}

function _natsInstanceModel () {
  return NatsInstanceManager.getEntity()
}

function _natsConnectionModel () {
  return NatsConnectionManager.getEntity()
}

const DEFAULT_LIMIT = 100
const MAX_LIMIT = 500
const DEFAULT_SUBGRAPH_DEPTH = 1
const MAX_SUBGRAPH_DEPTH = 2
const MAX_SUBGRAPH_LIMIT = 200

function _isKubernetesControlPlane () {
  const controlPlane = process.env.CONTROL_PLANE || config.get('app.ControlPlane')
  return controlPlane && String(controlPlane).toLowerCase() === 'kubernetes'
}

function _getControlPlane () {
  return _isKubernetesControlPlane() ? 'kubernetes' : 'remote'
}

function _parseLimitOffset (query) {
  let limit = DEFAULT_LIMIT
  if (query.limit !== undefined && query.limit !== null && query.limit !== '') {
    const parsedLimit = parseInt(query.limit, 10)
    if (!isNaN(parsedLimit) && parsedLimit > 0) {
      limit = Math.min(parsedLimit, MAX_LIMIT)
    }
  }

  let offset = 0
  if (query.offset !== undefined && query.offset !== null && query.offset !== '') {
    const parsedOffset = parseInt(query.offset, 10)
    if (!isNaN(parsedOffset) && parsedOffset >= 0) {
      offset = parsedOffset
    }
  }

  return { limit, offset }
}

async function _validateListQuery (query) {
  await Validator.validate(query || {}, Validator.schemas.networkTopologyListQuery)
  return _parseLimitOffset(query || {})
}

async function _validateSubgraphQuery (query) {
  await Validator.validate(query || {}, Validator.schemas.networkTopologySubgraphQuery)
  const { limit } = _parseLimitOffset(query || {})
  let depth = DEFAULT_SUBGRAPH_DEPTH
  if (query.depth !== undefined && query.depth !== null && query.depth !== '') {
    const parsedDepth = parseInt(query.depth, 10)
    if (!isNaN(parsedDepth) && parsedDepth > 0) {
      depth = Math.min(parsedDepth, MAX_SUBGRAPH_DEPTH)
    }
  }
  const nodeLimit = Math.min(limit, MAX_SUBGRAPH_LIMIT)
  return {
    center: query.center,
    depth,
    limit: nodeLimit
  }
}

function _getRouterNodeId (router, defaultRouter) {
  return (defaultRouter && router.id === defaultRouter.id)
    ? Constants.DEFAULT_ROUTER_NAME
    : router.iofogUuid
}

function _getNatsNodeId (nats, defaultHub) {
  return (defaultHub && nats.id === defaultHub.id)
    ? Constants.DEFAULT_NATS_HUB_NAME
    : nats.iofogUuid
}

function _routerDeploymentTarget (router, defaultRouter) {
  if (defaultRouter && router.id === defaultRouter.id) {
    return _isKubernetesControlPlane() ? 'kubernetes' : 'remote'
  }
  return 'edgelet'
}

function _natsDeploymentTarget (nats, defaultHub) {
  if (defaultHub && nats.id === defaultHub.id) {
    return _isKubernetesControlPlane() ? 'kubernetes' : 'remote'
  }
  return 'edgelet'
}

function _routerRole (router, defaultRouter) {
  if (defaultRouter && router.id === defaultRouter.id) {
    return 'default'
  }
  return router.isEdge ? 'edge' : 'interior'
}

function _natsRole (nats, defaultHub) {
  if (defaultHub && nats.id === defaultHub.id) {
    return 'hub'
  }
  return nats.isLeaf ? 'leaf' : 'server'
}

function _routerMode (router) {
  return router.isEdge ? 'edge' : 'interior'
}

function _natsMode (nats) {
  return nats.isLeaf ? 'leaf' : 'server'
}

function _routerDisplayName (router, defaultRouter, fog) {
  const deploymentTarget = _routerDeploymentTarget(router, defaultRouter)
  if (deploymentTarget === 'kubernetes') {
    return 'Kubernetes Router'
  }
  if (deploymentTarget === 'remote') {
    return 'Default Router'
  }
  return fog ? fog.name : router.iofogUuid
}

function _natsDisplayName (nats, defaultHub, fog) {
  const deploymentTarget = _natsDeploymentTarget(nats, defaultHub)
  if (deploymentTarget === 'kubernetes') {
    return 'Kubernetes NATS Hub'
  }
  if (deploymentTarget === 'remote') {
    return 'Default NATS Hub'
  }
  return fog ? fog.name : nats.iofogUuid
}

async function _loadFogMap (iofogUuids, transaction) {
  const uuids = [...new Set((iofogUuids || []).filter(Boolean))]
  if (!uuids.length) {
    return new Map()
  }

  const fogs = await FogManager.findAll({ uuid: { [Op.in]: uuids } }, transaction)

  return new Map(fogs.map((fog) => [fog.uuid, fog]))
}

function _formatRouterListNode (router, defaultRouter, fogMap) {
  const fog = router.iofogUuid ? fogMap.get(router.iofogUuid) : null
  return {
    id: _getRouterNodeId(router, defaultRouter),
    iofogUuid: router.iofogUuid,
    fogName: fog ? fog.name : null,
    host: router.host || (fog ? fog.host : null) || null,
    deploymentTarget: _routerDeploymentTarget(router, defaultRouter),
    displayName: _routerDisplayName(router, defaultRouter, fog),
    role: _routerRole(router, defaultRouter),
    mode: _routerMode(router)
  }
}

function _formatRouterDetailNode (router, defaultRouter, fogMap) {
  return {
    ..._formatRouterListNode(router, defaultRouter, fogMap),
    messagingPort: router.messagingPort,
    edgeRouterPort: router.edgeRouterPort,
    interRouterPort: router.interRouterPort,
    isDefault: !!(defaultRouter && router.id === defaultRouter.id)
  }
}

function _formatNatsListNode (nats, defaultHub, fogMap) {
  const fog = nats.iofogUuid ? fogMap.get(nats.iofogUuid) : null
  return {
    id: _getNatsNodeId(nats, defaultHub),
    iofogUuid: nats.iofogUuid,
    fogName: fog ? fog.name : null,
    host: nats.host || (fog ? fog.host : null) || null,
    deploymentTarget: _natsDeploymentTarget(nats, defaultHub),
    displayName: _natsDisplayName(nats, defaultHub, fog),
    role: _natsRole(nats, defaultHub),
    mode: _natsMode(nats)
  }
}

function _formatNatsDetailNode (nats, defaultHub, fogMap) {
  return {
    ..._formatNatsListNode(nats, defaultHub, fogMap),
    serverPort: nats.serverPort,
    leafPort: nats.leafPort,
    clusterPort: nats.clusterPort,
    mqttPort: nats.mqttPort,
    httpPort: nats.httpPort,
    jsStorageSize: nats.jsStorageSize,
    jsMemoryStoreSize: nats.jsMemoryStoreSize,
    isHub: !!(defaultHub && nats.id === defaultHub.id)
  }
}

function _formatRouterConnection (connection, defaultRouter) {
  return {
    id: connection.id,
    source: _getRouterNodeId(connection.source, defaultRouter),
    dest: _getRouterNodeId(connection.dest, defaultRouter)
  }
}

function _formatNatsConnection (connection, defaultHub) {
  return {
    id: connection.id,
    source: _getNatsNodeId(connection.source, defaultHub),
    dest: _getNatsNodeId(connection.dest, defaultHub)
  }
}

async function _buildRouterWhere (query, transaction) {
  const where = {}

  if (query.role === 'default') {
    where.isDefault = true
  } else if (query.role === 'edge') {
    where.isEdge = true
    where.isDefault = false
  } else if (query.role === 'interior') {
    where.isEdge = false
    where.isDefault = false
  }

  if (query.deploymentTarget === 'edgelet') {
    where.iofogUuid = { [Op.ne]: null }
  } else if (query.deploymentTarget === 'kubernetes') {
    if (!_isKubernetesControlPlane()) {
      return { where: { id: -1 }, empty: true }
    }
    where.isDefault = true
  } else if (query.deploymentTarget === 'remote') {
    if (_isKubernetesControlPlane()) {
      return { where: { id: -1 }, empty: true }
    }
    where.isDefault = true
  }

  if (query.search) {
    const matchingFogs = await FogManager.findAll({ name: { [Op.like]: `${query.search}%` } }, transaction)
    const uuids = matchingFogs.map((fog) => fog.uuid)
    if (!_applyFogUuidSearchFilter(where, uuids)) {
      return { where: { id: -1 }, empty: true }
    }
  }

  return { where, empty: false }
}

function _applyFogUuidSearchFilter (where, uuids) {
  if (!uuids.length) {
    return null
  }
  where.iofogUuid = where.iofogUuid
    ? { [Op.and]: [where.iofogUuid, { [Op.in]: uuids }] }
    : { [Op.in]: uuids }
  return where
}

async function _buildNatsWhere (query, transaction) {
  const defaultHub = await NatsInstanceManager.findOne({ isHub: true }, transaction)
  const where = {}

  if (query.role === 'hub') {
    where.isHub = true
  } else if (query.role === 'leaf') {
    where.isLeaf = true
    where.isHub = false
  } else if (query.role === 'server') {
    where.isLeaf = false
    where.isHub = false
  }

  if (query.deploymentTarget === 'edgelet') {
    where.iofogUuid = { [Op.ne]: null }
  } else if (query.deploymentTarget === 'kubernetes') {
    if (!_isKubernetesControlPlane() || !defaultHub) {
      return { where: { id: -1 }, empty: true }
    }
    where.id = defaultHub.id
  } else if (query.deploymentTarget === 'remote') {
    if (_isKubernetesControlPlane() || !defaultHub) {
      return { where: { id: -1 }, empty: true }
    }
    where.id = defaultHub.id
  }

  if (query.search) {
    const matchingFogs = await FogManager.findAll({ name: { [Op.like]: `${query.search}%` } }, transaction)
    const uuids = matchingFogs.map((fog) => fog.uuid)
    if (!_applyFogUuidSearchFilter(where, uuids)) {
      return { where: { id: -1 }, empty: true }
    }
  }

  return { where, empty: false }
}

async function _findRouterByNodeId (nodeId, transaction) {
  const defaultRouter = await RouterManager.findOne({ isDefault: true }, transaction)
  if (nodeId === Constants.DEFAULT_ROUTER_NAME) {
    if (!defaultRouter) {
      throw new Errors.NotFoundError(`Router node '${nodeId}' not found`)
    }
    return { router: defaultRouter, defaultRouter }
  }

  const router = await RouterManager.findOne({ iofogUuid: nodeId }, transaction)
  if (!router) {
    throw new Errors.NotFoundError(`Router node '${nodeId}' not found`)
  }
  return { router, defaultRouter }
}

async function _findNatsByNodeId (nodeId, transaction) {
  const defaultHub = await NatsInstanceManager.findOne({ isHub: true }, transaction)
  if (nodeId === Constants.DEFAULT_NATS_HUB_NAME) {
    if (!defaultHub) {
      throw new Errors.NotFoundError(`NATS node '${nodeId}' not found`)
    }
    return { nats: defaultHub, defaultHub }
  }

  const nats = await NatsInstanceManager.findOne({ iofogUuid: nodeId }, transaction)
  if (!nats) {
    throw new Errors.NotFoundError(`NATS node '${nodeId}' not found`)
  }
  return { nats, defaultHub }
}

async function _countRouterRoles (transaction) {
  const [defaultCount, edgeCount, interiorCount] = await Promise.all([
    _routerModel().count({ where: { isDefault: true }, transaction }),
    _routerModel().count({ where: { isEdge: true, isDefault: false }, transaction }),
    _routerModel().count({ where: { isEdge: false, isDefault: false }, transaction })
  ])
  return { default: defaultCount, edge: edgeCount, interior: interiorCount }
}

async function _countNatsRoles (transaction) {
  const [hubCount, leafCount, serverCount] = await Promise.all([
    _natsInstanceModel().count({ where: { isHub: true }, transaction }),
    _natsInstanceModel().count({ where: { isLeaf: true, isHub: false }, transaction }),
    _natsInstanceModel().count({ where: { isLeaf: false, isHub: false }, transaction })
  ])
  return { hub: hubCount, leaf: leafCount, server: serverCount }
}

function _buildSpokeGroups (connections, getNodeId, getRole, defaultNodeId) {
  const groups = new Map()
  for (const connection of connections || []) {
    const upstreamOf = getNodeId(connection.dest)
    if (upstreamOf !== defaultNodeId) {
      continue
    }
    const role = getRole(connection.source)
    const key = `${upstreamOf}:${role}`
    groups.set(key, (groups.get(key) || 0) + 1)
  }

  return [...groups.entries()].map(([key, count]) => {
    const [upstreamOf, role] = key.split(':')
    return { upstreamOf, role, count }
  })
}

async function getSummary (_req, transaction) {
  const [routerTotalNodes, routerTotalConnections, natsTotalNodes, natsTotalConnections, routerByRole, natsByRole] = await Promise.all([
    _routerModel().count({ transaction }),
    _routerConnectionModel().count({ transaction }),
    _natsInstanceModel().count({ transaction }),
    _natsConnectionModel().count({ transaction }),
    _countRouterRoles(transaction),
    _countNatsRoles(transaction)
  ])

  return {
    controlPlane: _getControlPlane(),
    router: {
      totalNodes: routerTotalNodes,
      totalConnections: routerTotalConnections,
      byRole: routerByRole
    },
    nats: {
      totalNodes: natsTotalNodes,
      totalConnections: natsTotalConnections,
      byRole: natsByRole
    }
  }
}

async function getRouterOverview (_req, transaction) {
  const defaultRouter = await RouterManager.findOne({ isDefault: true }, transaction)
  const interiorRouters = await RouterManager.findAll({ isDefault: false, isEdge: false }, transaction)
  const fogMap = await _loadFogMap(
    interiorRouters.map((router) => router.iofogUuid).concat(defaultRouter ? [defaultRouter.iofogUuid] : []),
    transaction
  )

  let spokeGroups = []
  if (defaultRouter) {
    const connections = await RouterConnectionManager.findAllWithRouters({ destRouter: defaultRouter.id }, transaction)
    spokeGroups = _buildSpokeGroups(
      connections,
      (router) => _getRouterNodeId(router, defaultRouter),
      (router) => _routerRole(router, defaultRouter),
      Constants.DEFAULT_ROUTER_NAME
    )
  }

  return {
    defaultNode: defaultRouter ? _formatRouterListNode(defaultRouter, defaultRouter, fogMap) : null,
    interiorNodes: interiorRouters.map((router) => _formatRouterListNode(router, defaultRouter, fogMap)),
    spokeGroups
  }
}

async function getNatsOverview (_req, transaction) {
  const defaultHub = await NatsInstanceManager.findOne({ isHub: true }, transaction)
  const serverNodes = await NatsInstanceManager.findAll({ isLeaf: false, isHub: false }, transaction)
  const fogMap = await _loadFogMap(
    serverNodes.map((nats) => nats.iofogUuid).concat(defaultHub ? [defaultHub.iofogUuid] : []),
    transaction
  )

  let spokeGroups = []
  if (defaultHub) {
    const connections = await NatsConnectionManager.findAllWithNats({ destNats: defaultHub.id }, transaction)
    spokeGroups = _buildSpokeGroups(
      connections,
      (nats) => _getNatsNodeId(nats, defaultHub),
      (nats) => _natsRole(nats, defaultHub),
      Constants.DEFAULT_NATS_HUB_NAME
    )
  }

  return {
    defaultNode: defaultHub ? _formatNatsListNode(defaultHub, defaultHub, fogMap) : null,
    serverNodes: serverNodes.map((nats) => _formatNatsListNode(nats, defaultHub, fogMap)),
    spokeGroups
  }
}

async function listRouterNodes (req, transaction) {
  const { limit, offset } = await _validateListQuery(req.query)
  const { where, empty } = await _buildRouterWhere(req.query || {}, transaction)
  if (empty) {
    return { nodes: [], total: 0, limit, offset }
  }

  const defaultRouter = await RouterManager.findOne({ isDefault: true }, transaction)
  const { count, rows } = await _routerModel().findAndCountAll({
    where,
    limit,
    offset,
    order: [['id', 'ASC']],
    transaction
  })

  const fogMap = await _loadFogMap(rows.map((router) => router.iofogUuid), transaction)
  return {
    nodes: rows.map((router) => _formatRouterListNode(router, defaultRouter, fogMap)),
    total: count,
    limit,
    offset
  }
}

async function listNatsNodes (req, transaction) {
  const { limit, offset } = await _validateListQuery(req.query)
  const { where, empty } = await _buildNatsWhere(req.query || {}, transaction)
  if (empty) {
    return { nodes: [], total: 0, limit, offset }
  }

  const defaultHub = await NatsInstanceManager.findOne({ isHub: true }, transaction)
  const { count, rows } = await _natsInstanceModel().findAndCountAll({
    where,
    limit,
    offset,
    order: [['id', 'ASC']],
    transaction
  })

  const fogMap = await _loadFogMap(rows.map((nats) => nats.iofogUuid), transaction)
  return {
    nodes: rows.map((nats) => _formatNatsListNode(nats, defaultHub, fogMap)),
    total: count,
    limit,
    offset
  }
}

async function getRouterNode (req, transaction) {
  const { router, defaultRouter } = await _findRouterByNodeId(req.params.id, transaction)
  const fogMap = await _loadFogMap([router.iofogUuid], transaction)
  return _formatRouterDetailNode(router, defaultRouter, fogMap)
}

async function getNatsNode (req, transaction) {
  const { nats, defaultHub } = await _findNatsByNodeId(req.params.id, transaction)
  const fogMap = await _loadFogMap([nats.iofogUuid], transaction)
  return _formatNatsDetailNode(nats, defaultHub, fogMap)
}

async function getRouterNodeConnections (req, transaction) {
  const { router, defaultRouter } = await _findRouterByNodeId(req.params.id, transaction)
  const [upstreamConnections, downstreamConnections] = await Promise.all([
    RouterConnectionManager.findAllWithRouters({ sourceRouter: router.id }, transaction),
    RouterConnectionManager.findAllWithRouters({ destRouter: router.id }, transaction)
  ])

  return {
    upstream: (upstreamConnections || []).map((connection) => _formatRouterConnection(connection, defaultRouter)),
    downstream: (downstreamConnections || []).map((connection) => _formatRouterConnection(connection, defaultRouter))
  }
}

async function getNatsNodeConnections (req, transaction) {
  const { nats, defaultHub } = await _findNatsByNodeId(req.params.id, transaction)
  const [upstreamConnections, downstreamConnections] = await Promise.all([
    NatsConnectionManager.findAllWithNats({ sourceNats: nats.id }, transaction),
    NatsConnectionManager.findAllWithNats({ destNats: nats.id }, transaction)
  ])

  return {
    upstream: (upstreamConnections || []).map((connection) => _formatNatsConnection(connection, defaultHub)),
    downstream: (downstreamConnections || []).map((connection) => _formatNatsConnection(connection, defaultHub))
  }
}

async function listRouterConnections (req, transaction) {
  const { limit, offset } = await _validateListQuery(req.query)
  const defaultRouter = await RouterManager.findOne({ isDefault: true }, transaction)
  const { count, rows } = await _routerConnectionModel().findAndCountAll({
    include: [
      { model: _routerModel(), as: 'source', required: true },
      { model: _routerModel(), as: 'dest', required: true }
    ],
    limit,
    offset,
    order: [['id', 'ASC']],
    transaction
  })

  return {
    connections: rows.map((connection) => _formatRouterConnection(connection, defaultRouter)),
    total: count,
    limit,
    offset
  }
}

async function listNatsConnections (req, transaction) {
  const { limit, offset } = await _validateListQuery(req.query)
  const defaultHub = await NatsInstanceManager.findOne({ isHub: true }, transaction)
  const { count, rows } = await _natsConnectionModel().findAndCountAll({
    include: [
      { model: _natsInstanceModel(), as: 'source', required: true },
      { model: _natsInstanceModel(), as: 'dest', required: true }
    ],
    limit,
    offset,
    order: [['id', 'ASC']],
    transaction
  })

  return {
    connections: rows.map((connection) => _formatNatsConnection(connection, defaultHub)),
    total: count,
    limit,
    offset
  }
}

async function _buildSubgraph (layer, centerId, depth, nodeLimit, transaction) {
  const isRouter = layer === 'router'
  const findByNodeId = isRouter ? _findRouterByNodeId : _findNatsByNodeId
  const connectionManager = isRouter ? RouterConnectionManager : NatsConnectionManager
  const sourceField = isRouter ? 'sourceRouter' : 'sourceNats'
  const destField = isRouter ? 'destRouter' : 'destNats'
  const findAllWith = isRouter ? 'findAllWithRouters' : 'findAllWithNats'
  const formatListNode = isRouter ? _formatRouterListNode : _formatNatsListNode
  const formatConnection = isRouter ? _formatRouterConnection : _formatNatsConnection

  const centerLookup = await findByNodeId(centerId, transaction)
  const anchor = isRouter ? centerLookup.router : centerLookup.nats
  const defaultAnchor = isRouter ? centerLookup.defaultRouter : centerLookup.defaultHub

  const nodeRecords = new Map([[anchor.id, anchor]])
  const connectionRecords = new Map()
  let frontierIds = new Set([anchor.id])

  for (let hop = 0; hop < depth; hop++) {
    const nextFrontier = new Set()
    for (const nodeId of frontierIds) {
      const [upstream, downstream] = await Promise.all([
        connectionManager[findAllWith]({ [sourceField]: nodeId }, transaction),
        connectionManager[findAllWith]({ [destField]: nodeId }, transaction)
      ])

      for (const connection of [...(upstream || []), ...(downstream || [])]) {
        connectionRecords.set(connection.id, connection)
        nodeRecords.set(connection.source.id, connection.source)
        nodeRecords.set(connection.dest.id, connection.dest)
        if (connection.source.id !== nodeId) {
          nextFrontier.add(connection.source.id)
        }
        if (connection.dest.id !== nodeId) {
          nextFrontier.add(connection.dest.id)
        }
      }
    }
    frontierIds = nextFrontier
    if (nodeRecords.size >= nodeLimit) {
      break
    }
  }

  const limitedNodes = [...nodeRecords.values()].slice(0, nodeLimit)
  const limitedNodeIds = new Set(limitedNodes.map((node) => node.id))
  const fogMap = await _loadFogMap(limitedNodes.map((node) => node.iofogUuid), transaction)

  const connections = [...connectionRecords.values()]
    .filter((connection) => limitedNodeIds.has(connection.source.id) && limitedNodeIds.has(connection.dest.id))
    .map((connection) => formatConnection(connection, defaultAnchor))

  return {
    nodes: limitedNodes.map((node) => formatListNode(node, defaultAnchor, fogMap)),
    connections
  }
}

async function getRouterSubgraph (req, transaction) {
  const { center, depth, limit } = await _validateSubgraphQuery(req.query)
  return _buildSubgraph('router', center, depth, limit, transaction)
}

async function getNatsSubgraph (req, transaction) {
  const { center, depth, limit } = await _validateSubgraphQuery(req.query)
  return _buildSubgraph('nats', center, depth, limit, transaction)
}

module.exports = {
  getSummary: TransactionDecorator.generateTransaction(getSummary),
  getRouterOverview: TransactionDecorator.generateTransaction(getRouterOverview),
  getNatsOverview: TransactionDecorator.generateTransaction(getNatsOverview),
  listRouterNodes: TransactionDecorator.generateTransaction(listRouterNodes),
  listNatsNodes: TransactionDecorator.generateTransaction(listNatsNodes),
  getRouterNode: TransactionDecorator.generateTransaction(getRouterNode),
  getNatsNode: TransactionDecorator.generateTransaction(getNatsNode),
  getRouterNodeConnections: TransactionDecorator.generateTransaction(getRouterNodeConnections),
  getNatsNodeConnections: TransactionDecorator.generateTransaction(getNatsNodeConnections),
  listRouterConnections: TransactionDecorator.generateTransaction(listRouterConnections),
  listNatsConnections: TransactionDecorator.generateTransaction(listNatsConnections),
  getRouterSubgraph: TransactionDecorator.generateTransaction(getRouterSubgraph),
  getNatsSubgraph: TransactionDecorator.generateTransaction(getNatsSubgraph)
}
