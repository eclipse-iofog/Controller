const Errors = require('../helpers/errors')
const ErrorMessages = require('../helpers/error-messages')
const AppHelper = require('../helpers/app-helper')
const MicroserviceTemplateManager = require('../data/managers/microservice-template-manager')
const MicroserviceTemplateVariableManager = require('../data/managers/microservice-template-variable-manager')
const TransactionDecorator = require('../decorators/transaction-decorator')
const Validator = require('../schemas')

const INSTANCE_FIELDS = ['name', 'iofogUuid', 'flowId', 'template']

function _toPlain (row) {
  if (!row) {
    return null
  }
  return typeof row.toJSON === 'function' ? row.toJSON() : row
}

function _cloneJson (value, fallback) {
  if (value == null || value === '') {
    return fallback
  }
  if (typeof value === 'object') {
    return JSON.parse(JSON.stringify(value))
  }
  try {
    return JSON.parse(value)
  } catch (error) {
    return fallback
  }
}

function _parseStoredDefaultValue (defaultValue) {
  if (defaultValue === undefined) {
    return undefined
  }
  if (typeof defaultValue !== 'string') {
    return defaultValue
  }
  try {
    return JSON.parse(defaultValue)
  } catch (error) {
    return defaultValue
  }
}

function stripInstanceFields (microservice) {
  const clone = { ...(microservice || {}) }
  for (const field of INSTANCE_FIELDS) {
    delete clone[field]
  }
  return clone
}

function toWireVariable (variable) {
  const plain = _toPlain(variable) || variable
  const wire = {
    key: plain.key
  }
  if (plain.description !== undefined) {
    wire.description = plain.description
  }
  if (plain.defaultValue !== undefined) {
    wire.defaultValue = _parseStoredDefaultValue(plain.defaultValue)
  }
  return wire
}

function toWireTemplate (row) {
  const plain = _toPlain(row)
  if (!plain) {
    return null
  }
  return {
    name: plain.name,
    description: plain.description != null ? plain.description : '',
    variables: (plain.variables || []).map(toWireVariable),
    microservice: _cloneJson(plain.microserviceJSON, {})
  }
}

function _buildUserVariableMap (userVariables) {
  if (Array.isArray(userVariables)) {
    return userVariables.reduce((acc, variable) => {
      if (variable && variable.key != null) {
        acc[variable.key] = variable.value
      }
      return acc
    }, {})
  }
  if (userVariables && typeof userVariables === 'object') {
    return { ...userVariables }
  }
  return {}
}

function _buildDefaultVariableMap (schemaVariables) {
  return (schemaVariables || []).reduce((acc, variable) => {
    if (variable && variable.key != null && variable.defaultValue !== undefined) {
      acc[variable.key] = variable.defaultValue
    }
    return acc
  }, {})
}

function _parseJsonObjectField (value) {
  if (typeof value !== 'string' || value === '') {
    return undefined
  }
  const trimmed = value.trim()
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    return undefined
  }
  try {
    const parsed = JSON.parse(value)
    if (parsed && typeof parsed === 'object') {
      return parsed
    }
  } catch (error) {
    return undefined
  }
  return undefined
}

async function _createVariable (microserviceTemplateId, variableData, transaction) {
  const newVariable = {
    ...variableData
  }
  if (newVariable.defaultValue !== undefined) {
    newVariable.defaultValue = JSON.stringify(newVariable.defaultValue)
  }
  return MicroserviceTemplateVariableManager.create({
    ...newVariable,
    microserviceTemplateId
  }, transaction)
}

async function _updateVariables (microserviceTemplateId, variables, transaction) {
  await MicroserviceTemplateVariableManager.delete({ microserviceTemplateId }, transaction)
  for (const variableData of variables || []) {
    await _createVariable(microserviceTemplateId, variableData, transaction)
  }
}

async function getTemplateByName (name, transaction) {
  const template = await MicroserviceTemplateManager.findOnePopulated({ name }, transaction)
  if (!template) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.MICROSERVICE_TEMPLATE_NOT_FOUND, name))
  }
  return template
}

async function listMicroserviceTemplatesEndpoint (transaction) {
  const templates = await MicroserviceTemplateManager.findAllPopulated({}, transaction)
  return {
    microserviceTemplates: templates.map(toWireTemplate)
  }
}

async function getMicroserviceTemplateEndpoint (name, transaction) {
  const template = await getTemplateByName(name, transaction)
  return toWireTemplate(template)
}

async function createMicroserviceTemplateEndpoint (data, transaction) {
  await Validator.validate(data, Validator.schemas.microserviceTemplateCreate)

  const existing = await MicroserviceTemplateManager.findOne({ name: data.name }, transaction)
  if (existing) {
    throw new Errors.ConflictError(AppHelper.formatMessage(ErrorMessages.MICROSERVICE_TEMPLATE_ALREADY_EXISTS, data.name))
  }

  const created = await MicroserviceTemplateManager.create({
    name: data.name,
    description: data.description != null ? data.description : '',
    microserviceJSON: JSON.stringify(stripInstanceFields(data.microservice))
  }, transaction)

  try {
    if (data.variables) {
      for (const variableData of data.variables) {
        await _createVariable(created.id, variableData, transaction)
      }
    }
    return getMicroserviceTemplateEndpoint(created.name, transaction)
  } catch (error) {
    await deleteMicroserviceTemplateEndpoint(created.name, transaction)
    throw error
  }
}

async function updateMicroserviceTemplateEndpoint (name, data, transaction) {
  await Validator.validate(data, Validator.schemas.microserviceTemplateUpdate)
  const existing = await getTemplateByName(name, transaction)
  const current = toWireTemplate(existing)

  const nextMicroservice = data.microservice !== undefined
    ? stripInstanceFields(data.microservice)
    : current.microservice
  const nextDescription = data.description !== undefined ? data.description : current.description

  await MicroserviceTemplateManager.update({ name }, {
    description: nextDescription,
    microserviceJSON: JSON.stringify(nextMicroservice)
  }, transaction)

  if (data.variables !== undefined) {
    await _updateVariables(existing.id, data.variables, transaction)
  }

  return getMicroserviceTemplateEndpoint(name, transaction)
}

async function upsertMicroserviceTemplateEndpoint (name, data, transaction) {
  const existing = await MicroserviceTemplateManager.findOne({ name }, transaction)
  if (existing) {
    return updateMicroserviceTemplateEndpoint(name, data, transaction)
  }
  return createMicroserviceTemplateEndpoint({ ...data, name }, transaction)
}

async function deleteMicroserviceTemplateEndpoint (name, transaction) {
  await getTemplateByName(name, transaction)
  await MicroserviceTemplateManager.delete({ name }, transaction)
  return {}
}

async function getMicroserviceDataFromTemplate (deploymentData, isCLI, transaction) {
  await Validator.validate(deploymentData, Validator.schemas.microserviceTemplateDeploy)

  const templateRow = await MicroserviceTemplateManager.findOnePopulated({ name: deploymentData.name }, transaction)
  if (!templateRow) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.MICROSERVICE_TEMPLATE_NOT_FOUND, deploymentData.name))
  }

  const template = toWireTemplate(templateRow)
  if (!template.microservice || typeof template.microservice !== 'object' || Array.isArray(template.microservice)) {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.MICROSERVICE_TEMPLATE_INVALID, deploymentData.name))
  }

  const spec = stripInstanceFields(template.microservice)
  const parsedConfig = _parseJsonObjectField(spec.config)
  if (parsedConfig !== undefined) {
    spec.config = parsedConfig
  }
  const parsedAnnotations = _parseJsonObjectField(spec.annotations)
  if (parsedAnnotations !== undefined) {
    spec.annotations = parsedAnnotations
  }

  const { rvaluesVarSubstition } = require('../helpers/template-helper')
  const variableMap = {
    ..._buildDefaultVariableMap(template.variables),
    ..._buildUserVariableMap(deploymentData.variables),
    self: spec
  }
  await rvaluesVarSubstition(spec, variableMap)

  if (spec.config && typeof spec.config === 'object' && !Array.isArray(spec.config)) {
    spec.config = JSON.stringify(spec.config)
  }
  if (spec.annotations && typeof spec.annotations === 'object' && !Array.isArray(spec.annotations)) {
    spec.annotations = JSON.stringify(spec.annotations)
  }

  return spec
}

module.exports = {
  listMicroserviceTemplatesEndpoint: TransactionDecorator.generateTransaction(listMicroserviceTemplatesEndpoint),
  getMicroserviceTemplateEndpoint: TransactionDecorator.generateTransaction(getMicroserviceTemplateEndpoint),
  createMicroserviceTemplateEndpoint: TransactionDecorator.generateTransaction(createMicroserviceTemplateEndpoint),
  updateMicroserviceTemplateEndpoint: TransactionDecorator.generateTransaction(updateMicroserviceTemplateEndpoint),
  upsertMicroserviceTemplateEndpoint: TransactionDecorator.generateTransaction(upsertMicroserviceTemplateEndpoint),
  deleteMicroserviceTemplateEndpoint: TransactionDecorator.generateTransaction(deleteMicroserviceTemplateEndpoint),
  getMicroserviceDataFromTemplate,
  toWireTemplate,
  stripInstanceFields,
  stripIdentityFields: stripInstanceFields
}
