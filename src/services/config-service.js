const AppHelper = require('../helpers/app-helper')
const Errors = require('../helpers/errors')
const ErrorMessages = require('../helpers/error-messages')
const ConfigManager = require('../data/managers/config-manager')
const TransactionDecorator = require('../decorators/transaction-decorator')
const Validator = require('../schemas')

async function listConfig (transaction) {
  const config = await ConfigManager.findAll({}, transaction)
  return {
    config: config.map(e => _getConfigElementObj(e))
  }
}

async function upsertConfigElement (configElementData, transaction) {
  await Validator.validate(configElementData, Validator.schemas.configElement)

  return ConfigManager.updateOrCreate({ key: configElementData.key }, configElementData, transaction)
}

function _getConfigElementObj (configElement) {
  return {
    key: configElement.key,
    value: configElement.value
  }
}

async function getConfigElement (key, transaction) {
  const configElement = await ConfigManager.findOne({ key }, transaction)
  if (!configElement) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_CONFIG_KEY, key))
  }
  return _getConfigElementObj(configElement)
}

module.exports = {
  listConfig: TransactionDecorator.generateTransaction(listConfig),
  upsertConfigElement: TransactionDecorator.generateTransaction(upsertConfigElement),
  getConfigElement: TransactionDecorator.generateTransaction(getConfigElement)
}
