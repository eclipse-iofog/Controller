const RouterService = require('../services/router-service')

const upsertDefaultRouter = async function (req) {
  const routerData = req.body
  return RouterService.upsertDefaultRouter(routerData)
}

const getRouterEndPoint = async function () {
  return RouterService.getDefaultRouter()
}

module.exports = {
  upsertDefaultRouter,
  getRouterEndPoint
}
