const constants = require('../helpers/constants')
const NetworkTopologyController = require('../controllers/network-topology-controller')
const ResponseDecorator = require('../decorators/response-decorator')
const logger = require('../logger')
const Errors = require('../helpers/errors')
const rbacMiddleware = require('../lib/rbac/middleware')

const defaultErrorCodes = [
  {
    code: constants.HTTP_CODE_UNAUTHORIZED,
    errors: [Errors.AuthenticationError]
  },
  {
    code: constants.HTTP_CODE_BAD_REQUEST,
    errors: [Errors.ValidationError]
  }
]

const readWithNotFoundErrorCodes = [
  ...defaultErrorCodes,
  {
    code: constants.HTTP_CODE_NOT_FOUND,
    errors: [Errors.NotFoundError]
  }
]

function createGetRoute (path, handler, errorCodes = defaultErrorCodes) {
  return {
    method: 'get',
    path,
    middleware: async (req, res) => {
      logger.apiReq(req)

      await rbacMiddleware.protect()(req, res, async () => {
        const endpoint = ResponseDecorator.handleErrors(
          handler,
          constants.HTTP_CODE_SUCCESS,
          errorCodes
        )
        const responseObject = await endpoint(req)
        const user = req.kauth && req.kauth.grant && req.kauth.grant.access_token
          ? req.kauth.grant.access_token.content.preferred_username
          : 'system'
        res
          .status(responseObject.code)
          .send(responseObject.body)

        logger.apiRes({ req, user, res, responseObject })
      })
    }
  }
}

module.exports = [
  createGetRoute('/api/v3/network-topology/summary', NetworkTopologyController.getSummaryEndPoint),
  createGetRoute('/api/v3/network-topology/router/overview', NetworkTopologyController.getRouterOverviewEndPoint),
  createGetRoute('/api/v3/network-topology/nats/overview', NetworkTopologyController.getNatsOverviewEndPoint),
  createGetRoute('/api/v3/network-topology/router/nodes', NetworkTopologyController.listRouterNodesEndPoint),
  createGetRoute('/api/v3/network-topology/nats/nodes', NetworkTopologyController.listNatsNodesEndPoint),
  createGetRoute(
    '/api/v3/network-topology/router/nodes/:id/connections',
    NetworkTopologyController.getRouterNodeConnectionsEndPoint,
    readWithNotFoundErrorCodes
  ),
  createGetRoute(
    '/api/v3/network-topology/nats/nodes/:id/connections',
    NetworkTopologyController.getNatsNodeConnectionsEndPoint,
    readWithNotFoundErrorCodes
  ),
  createGetRoute(
    '/api/v3/network-topology/router/nodes/:id',
    NetworkTopologyController.getRouterNodeEndPoint,
    readWithNotFoundErrorCodes
  ),
  createGetRoute(
    '/api/v3/network-topology/nats/nodes/:id',
    NetworkTopologyController.getNatsNodeEndPoint,
    readWithNotFoundErrorCodes
  ),
  createGetRoute('/api/v3/network-topology/router/connections', NetworkTopologyController.listRouterConnectionsEndPoint),
  createGetRoute('/api/v3/network-topology/nats/connections', NetworkTopologyController.listNatsConnectionsEndPoint),
  createGetRoute('/api/v3/network-topology/router/subgraph', NetworkTopologyController.getRouterSubgraphEndPoint),
  createGetRoute('/api/v3/network-topology/nats/subgraph', NetworkTopologyController.getNatsSubgraphEndPoint)
]
