const SecretService = require('../services/secret-service')
const YamlParserService = require('../services/yaml-parser-service')

const createSecretEndpoint = async function (req) {
  const secret = req.body
  return SecretService.createSecretEndpoint(secret)
}

const updateSecretEndpoint = async function (req) {
  const secret = req.body
  const secretName = req.params.name
  return SecretService.updateSecretEndpoint(secretName, secret)
}

const getSecretEndpoint = async function (req) {
  const secretName = req.params.name
  return SecretService.getSecretEndpoint(secretName)
}

const listSecretsEndpoint = async function (req) {
  return SecretService.listSecretsEndpoint()
}

const deleteSecretEndpoint = async function (req) {
  const secretName = req.params.name
  return SecretService.deleteSecretEndpoint(secretName)
}

const createSecretFromYamlEndpoint = async function (req) {
  const fileContent = req.file.buffer.toString()
  const secretData = await YamlParserService.parseSecretFile(fileContent)
  return SecretService.createSecretEndpoint(secretData)
}

const updateSecretFromYamlEndpoint = async function (req) {
  const fileContent = req.file.buffer.toString()
  const secretName = req.params.name
  const secretData = await YamlParserService.parseSecretFile(fileContent, {
    isUpdate: true,
    secretName
  })
  return SecretService.updateSecretEndpoint(secretName, secretData)
}

module.exports = {
  createSecretEndpoint,
  updateSecretEndpoint,
  getSecretEndpoint,
  listSecretsEndpoint,
  deleteSecretEndpoint,
  createSecretFromYamlEndpoint,
  updateSecretFromYamlEndpoint
}
