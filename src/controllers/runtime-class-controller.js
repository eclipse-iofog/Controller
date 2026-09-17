const RuntimeClassService = require('../services/runtime-class-service')
const YAMLParserService = require('../services/yaml-parser-service')

const listRuntimeClassesEndpoint = async (req) => {
  return RuntimeClassService.listRuntimeClassesEndpoint()
}

const getRuntimeClassEndpoint = async (req) => {
  return RuntimeClassService.getRuntimeClassEndpoint(req.params.name)
}

const createRuntimeClassEndpoint = async (req) => {
  return RuntimeClassService.createRuntimeClassEndpoint(req.body)
}

const updateRuntimeClassEndpoint = async (req) => {
  return RuntimeClassService.updateRuntimeClassEndpoint(req.params.name, req.body)
}

const deleteRuntimeClassEndpoint = async (req) => {
  return RuntimeClassService.deleteRuntimeClassEndpoint(req.params.name)
}

const createRuntimeClassYamlEndpoint = async (req) => {
  const fileContent = req.file.buffer.toString()
  const runtimeClassData = await YAMLParserService.parseRuntimeClassFile(fileContent)
  return RuntimeClassService.createRuntimeClassEndpoint(runtimeClassData)
}

const upsertRuntimeClassYamlEndpoint = async (req) => {
  const fileContent = req.file.buffer.toString()
  const name = req.params.name
  const runtimeClassData = await YAMLParserService.parseRuntimeClassFile(fileContent, {
    isUpdate: true,
    runtimeClassName: name
  })
  return RuntimeClassService.upsertRuntimeClassEndpoint(name, runtimeClassData)
}

const getRuntimeClassLinkEndpoint = async (req) => {
  return RuntimeClassService.getRuntimeClassLinkEndpoint(req.params.name)
}

const linkRuntimeClassEndpoint = async (req) => {
  return RuntimeClassService.linkRuntimeClassEndpoint(req.params.name, req.body.fogUuids)
}

const unlinkRuntimeClassEndpoint = async (req) => {
  return RuntimeClassService.unlinkRuntimeClassEndpoint(req.params.name, req.body.fogUuids)
}

module.exports = {
  listRuntimeClassesEndpoint,
  getRuntimeClassEndpoint,
  createRuntimeClassEndpoint,
  updateRuntimeClassEndpoint,
  deleteRuntimeClassEndpoint,
  createRuntimeClassYamlEndpoint,
  upsertRuntimeClassYamlEndpoint,
  getRuntimeClassLinkEndpoint,
  linkRuntimeClassEndpoint,
  unlinkRuntimeClassEndpoint
}
