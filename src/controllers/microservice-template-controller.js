const MicroserviceTemplateService = require('../services/microservice-template-service')
const YAMLParserService = require('../services/yaml-parser-service')
const errors = require('../helpers/errors')
const ErrorMessages = require('../helpers/error-messages')
const { rvaluesVarSubstition } = require('../helpers/template-helper')

async function _applyVariableSelfSubstitution (templateData) {
  if (!templateData.variables) {
    return templateData
  }
  await rvaluesVarSubstition(templateData.variables, { self: templateData.variables })
  return templateData
}

const listMicroserviceTemplatesEndpoint = async (req) => {
  return MicroserviceTemplateService.listMicroserviceTemplatesEndpoint()
}

const getMicroserviceTemplateEndpoint = async (req) => {
  return MicroserviceTemplateService.getMicroserviceTemplateEndpoint(req.params.name)
}

const createMicroserviceTemplateEndpoint = async (req) => {
  return MicroserviceTemplateService.createMicroserviceTemplateEndpoint(req.body)
}

const updateMicroserviceTemplateEndpoint = async (req) => {
  return MicroserviceTemplateService.updateMicroserviceTemplateEndpoint(req.params.name, req.body)
}

const deleteMicroserviceTemplateEndpoint = async (req) => {
  return MicroserviceTemplateService.deleteMicroserviceTemplateEndpoint(req.params.name)
}

const createMicroserviceTemplateYamlEndpoint = async (req) => {
  if (!req.file) {
    throw new errors.ValidationError(ErrorMessages.MICROSERVICE_TEMPLATE_FILE_NOT_FOUND)
  }
  const fileContent = req.file.buffer.toString()
  const templateData = await YAMLParserService.parseMicroserviceTemplateFile(fileContent)
  await _applyVariableSelfSubstitution(templateData)
  return MicroserviceTemplateService.createMicroserviceTemplateEndpoint(templateData)
}

const upsertMicroserviceTemplateYamlEndpoint = async (req) => {
  if (!req.file) {
    throw new errors.ValidationError(ErrorMessages.MICROSERVICE_TEMPLATE_FILE_NOT_FOUND)
  }
  const name = req.params.name
  const fileContent = req.file.buffer.toString()
  const templateData = await YAMLParserService.parseMicroserviceTemplateFile(fileContent, {
    isUpdate: true,
    templateName: name
  })
  await _applyVariableSelfSubstitution(templateData)
  return MicroserviceTemplateService.upsertMicroserviceTemplateEndpoint(name, templateData)
}

module.exports = {
  listMicroserviceTemplatesEndpoint,
  getMicroserviceTemplateEndpoint,
  createMicroserviceTemplateEndpoint,
  updateMicroserviceTemplateEndpoint,
  deleteMicroserviceTemplateEndpoint,
  createMicroserviceTemplateYamlEndpoint,
  upsertMicroserviceTemplateYamlEndpoint
}
