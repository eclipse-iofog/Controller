const ServiceService = require('../services/services-service')
const YamlParserService = require('../services/yaml-parser-service')

const createServiceEndpoint = async function (req) {
  const serviceData = req.body
  return ServiceService.createServiceEndpoint(serviceData)
}

const updateServiceEndpoint = async function (req) {
  const serviceName = req.params.name
  const serviceData = req.body
  return ServiceService.updateServiceEndpoint(serviceName, serviceData)
}

const deleteServiceEndpoint = async function (req) {
  const serviceName = req.params.name
  return ServiceService.deleteServiceEndpoint(serviceName)
}

const getServiceEndpoint = async function (req) {
  const serviceName = req.params.name
  return ServiceService.getServiceEndpoint(serviceName)
}

const listServicesEndpoint = async function (req) {
  return ServiceService.getServicesListEndpoint()
}

const createServiceYAMLEndpoint = async function (req) {
  const fileContent = req.file.buffer.toString()
  const serviceData = await YamlParserService.parseServiceFile(fileContent)
  return ServiceService.createServiceEndpoint(serviceData)
}

const updateServiceYAMLEndpoint = async function (req) {
  const serviceName = req.params.name
  const fileContent = req.file.buffer.toString()
  const serviceData = await YamlParserService.parseServiceFile(fileContent, {
    isUpdate: true,
    serviceName
  })
  return ServiceService.updateServiceEndpoint(serviceName, serviceData)
}

const reconcileServiceEndpoint = async function (req) {
  const serviceName = req.params.name
  return ServiceService.reconcileServiceEndpoint(serviceName)
}

module.exports = {
  createServiceEndpoint,
  updateServiceEndpoint,
  deleteServiceEndpoint,
  reconcileServiceEndpoint,
  getServiceEndpoint,
  listServicesEndpoint,
  createServiceYAMLEndpoint,
  updateServiceYAMLEndpoint
}
