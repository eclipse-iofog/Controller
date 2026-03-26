const CertificateService = require('../services/certificate-service')
const YamlParserService = require('../services/yaml-parser-service')

// CA Management
const createCAEndpoint = async function (req) {
  const ca = req.body
  return CertificateService.createCAEndpoint(ca)
}

const getCAEndpoint = async function (req) {
  const name = req.params.name
  return CertificateService.getCAEndpoint(name)
}

const listCAEndpoint = async function (req) {
  return CertificateService.listCAEndpoint()
}

const deleteCAEndpoint = async function (req) {
  const name = req.params.name
  return CertificateService.deleteCAEndpoint(name)
}

// Certificate Management
const createCertificateEndpoint = async function (req) {
  const cert = req.body
  return CertificateService.createCertificateEndpoint(cert)
}

const getCertificateEndpoint = async function (req) {
  const name = req.params.name
  return CertificateService.getCertificateEndpoint(name)
}

const listCertificatesEndpoint = async function (req) {
  return CertificateService.listCertificatesEndpoint()
}

const deleteCertificateEndpoint = async function (req) {
  const name = req.params.name
  return CertificateService.deleteCertificateEndpoint(name)
}

// Certificate Renewal
const renewCertificateEndpoint = async function (req) {
  const name = req.params.name
  return CertificateService.renewCertificateEndpoint(name)
}

// List Expiring Certificates
const listExpiringCertificatesEndpoint = async function (req) {
  const days = req.query.days ? parseInt(req.query.days) : 30
  return CertificateService.listExpiringCertificatesEndpoint(days)
}

// YAML Endpoint
const createCertificateFromYamlEndpoint = async function (req) {
  const fileContent = req.file.buffer.toString()
  const certData = await YamlParserService.parseCertificateFile(fileContent)

  if (certData.isCA) {
    delete certData.isCA
    return CertificateService.createCAEndpoint(certData)
  } else {
    return CertificateService.createCertificateEndpoint(certData)
  }
}

module.exports = {
  // CA endpoints
  createCAEndpoint,
  getCAEndpoint,
  listCAEndpoint,
  deleteCAEndpoint,

  // Certificate endpoints
  createCertificateEndpoint,
  getCertificateEndpoint,
  listCertificatesEndpoint,
  deleteCertificateEndpoint,
  // Certificate renewal endpoints
  renewCertificateEndpoint,
  listExpiringCertificatesEndpoint,

  // YAML endpoints
  createCertificateFromYamlEndpoint
}
