const ConfigService = require('../services/config-service')

const upsertConfigElementEndpoint = async function (req) {
  const configData = req.body
  return ConfigService.upsertConfigElement(configData)
}

const listConfigEndpoint = async function () {
  return ConfigService.listConfig()
}

const getConfigEndpoint = async function (req) {
  const key = req.params.key
  return ConfigService.getConfigElement(key)
}

module.exports = {
  upsertConfigElementEndpoint,
  listConfigEndpoint,
  getConfigEndpoint
}
