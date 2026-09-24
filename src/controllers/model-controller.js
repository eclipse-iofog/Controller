const ModelService = require('../services/model-service')
const YAMLParserService = require('../services/yaml-parser-service')

const listModelsEndpoint = async (req) => {
  return ModelService.listModelsEndpoint()
}

const getModelEndpoint = async (req) => {
  return ModelService.getModelEndpoint(req.params.name)
}

const createModelEndpoint = async (req) => {
  return ModelService.createModelEndpoint(req.body)
}

const updateModelEndpoint = async (req) => {
  return ModelService.updateModelEndpoint(req.params.name, req.body)
}

const deleteModelEndpoint = async (req) => {
  return ModelService.deleteModelEndpoint(req.params.name)
}

const createModelYamlEndpoint = async (req) => {
  const fileContent = req.file.buffer.toString()
  const modelData = await YAMLParserService.parseModelFile(fileContent)
  return ModelService.createModelEndpoint(modelData)
}

const upsertModelYamlEndpoint = async (req) => {
  const fileContent = req.file.buffer.toString()
  const name = req.params.name
  const modelData = await YAMLParserService.parseModelFile(fileContent, {
    isUpdate: true,
    modelName: name
  })
  return ModelService.upsertModelEndpoint(name, modelData)
}

const getModelLinkEndpoint = async (req) => {
  return ModelService.getModelLinkEndpoint(req.params.name)
}

const linkModelEndpoint = async (req) => {
  return ModelService.linkModelEndpoint(req.params.name, req.body.fogUuids)
}

const unlinkModelEndpoint = async (req) => {
  return ModelService.unlinkModelEndpoint(req.params.name, req.body.fogUuids)
}

module.exports = {
  listModelsEndpoint,
  getModelEndpoint,
  createModelEndpoint,
  updateModelEndpoint,
  deleteModelEndpoint,
  createModelYamlEndpoint,
  upsertModelYamlEndpoint,
  getModelLinkEndpoint,
  linkModelEndpoint,
  unlinkModelEndpoint
}
