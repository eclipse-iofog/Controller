const KnowledgeService = require('../services/knowledge-service')
const YAMLParserService = require('../services/yaml-parser-service')

const listKnowledgeEndpoint = async (req) => {
  return KnowledgeService.listKnowledgeEndpoint()
}

const getKnowledgeEndpoint = async (req) => {
  return KnowledgeService.getKnowledgeEndpoint(req.params.name)
}

const createKnowledgeEndpoint = async (req) => {
  return KnowledgeService.createKnowledgeEndpoint(req.body)
}

const updateKnowledgeEndpoint = async (req) => {
  return KnowledgeService.updateKnowledgeEndpoint(req.params.name, req.body)
}

const deleteKnowledgeEndpoint = async (req) => {
  return KnowledgeService.deleteKnowledgeEndpoint(req.params.name)
}

const createKnowledgeYamlEndpoint = async (req) => {
  const fileContent = req.file.buffer.toString()
  const knowledgeData = await YAMLParserService.parseKnowledgeFile(fileContent)
  return KnowledgeService.createKnowledgeEndpoint(knowledgeData)
}

const upsertKnowledgeYamlEndpoint = async (req) => {
  const fileContent = req.file.buffer.toString()
  const name = req.params.name
  const knowledgeData = await YAMLParserService.parseKnowledgeFile(fileContent, {
    isUpdate: true,
    knowledgeName: name
  })
  return KnowledgeService.upsertKnowledgeEndpoint(name, knowledgeData)
}

const getKnowledgeLinkEndpoint = async (req) => {
  return KnowledgeService.getKnowledgeLinkEndpoint(req.params.name)
}

const linkKnowledgeEndpoint = async (req) => {
  return KnowledgeService.linkKnowledgeEndpoint(req.params.name, req.body.fogUuids)
}

const unlinkKnowledgeEndpoint = async (req) => {
  return KnowledgeService.unlinkKnowledgeEndpoint(req.params.name, req.body.fogUuids)
}

module.exports = {
  listKnowledgeEndpoint,
  getKnowledgeEndpoint,
  createKnowledgeEndpoint,
  updateKnowledgeEndpoint,
  deleteKnowledgeEndpoint,
  createKnowledgeYamlEndpoint,
  upsertKnowledgeYamlEndpoint,
  getKnowledgeLinkEndpoint,
  linkKnowledgeEndpoint,
  unlinkKnowledgeEndpoint
}
