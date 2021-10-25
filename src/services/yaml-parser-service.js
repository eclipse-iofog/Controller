const Errors = require('../helpers/errors')
const lget = require('lodash/get')
const yaml = require('js-yaml')

async function parseAppFile (fileContent) {
  const doc = yaml.load(fileContent)
  if (doc.kind !== 'Application') {
    throw new Errors.ValidationError(`Invalid kind ${doc.kind}`)
  }
  if (doc.metadata == null || doc.spec == null) {
    throw new Errors.ValidationError('Invalid YAML format')
  }
  const application = {
    name: lget(doc, 'metadata.name', undefined),
    ...(await parseAppYAML(doc.spec))
  }
  return application
}

async function parseAppYAML (app) {
  const application = {
    ...app,
    isActivated: app.isActivated || true,
    microservices: await Promise.all((app.microservices || []).map(async (m) => parseMicroserviceYAML(m)))
  }
  return application
}

async function parseAppTemplateFile (fileContent) {
  const doc = yaml.load(fileContent)
  if (doc.kind !== 'ApplicationTemplate') {
    throw new Errors.ValidationError(`Invalid kind ${doc.kind}`)
  }
  if (doc.metadata == null || doc.spec == null) {
    throw new Errors.ValidationError('Invalid YAML format')
  }
  const appTemplate = {
    name: lget(doc, 'metadata.name', undefined),
    application: await parseAppYAML(doc.spec.application),
    description: doc.spec.description,
    variables: doc.spec.variables
  }
  _deleteUndefinedFields(appTemplate)
  return appTemplate
}

const mapImages = (images) => {
  const imgs = []
  if (images.x86 != null) {
    imgs.push({
      fogTypeId: 1,
      containerImage: images.x86
    })
  }
  if (images.arm != null) {
    imgs.push({
      fogTypeId: 2,
      containerImage: images.arm
    })
  }
  return imgs
}

const parseMicroserviceImages = async (fileImages) => {
  if (fileImages.catalogId != null) {
    return { registryId: undefined, images: undefined, catalogItemId: fileImages.catalogId }
  }
  const registryByName = {
    remote: 1,
    local: 2
  }
  const images = mapImages(fileImages)
  const registryId = fileImages.registry != null ? registryByName[fileImages.registry] || Number(fileImages.registry) : 1
  return { registryId, catalogItemId: undefined, images }
}

const parseMicroserviceYAML = async (microservice) => {
  const { registryId, catalogItemId, images } = await parseMicroserviceImages(microservice.images)
  const microserviceData = {
    config: microservice.config != null ? JSON.stringify(microservice.config) : undefined,
    name: microservice.name,
    catalogItemId,
    agentName: lget(microservice, 'agent.name'),
    registryId,
    ...microservice.container,
    ports: (lget(microservice, 'container.ports', [])),
    volumeMappings: lget(microservice, 'container.volumes', []),
    cmd: lget(microservice, 'container.commands', []),
    env: (lget(microservice, 'container.env', [])).map(e => ({ key: e.key.toString(), value: e.value.toString() })),
    images,
    extraHosts: lget(microservice, 'container.extraHosts', []),
    application: microservice.application
  }
  _deleteUndefinedFields(microserviceData)
  return microserviceData
}

async function parseMicroserviceFile (fileContent) {
  const doc = yaml.load(fileContent)
  if (doc.kind !== 'Microservice') {
    throw new Errors.ValidationError(`Invalid kind ${doc.kind}`)
  }
  if (doc.metadata == null || doc.spec == null) {
    throw new Errors.ValidationError('Invalid YAML format')
  }
  const microservice = {
    name: lget(doc, 'metadata.name', undefined),
    ...(await parseMicroserviceYAML(doc.spec))
  }
  // Name could be FQName: <app_name>/<msvc_name>
  if (microservice.name) {
    const splittedName = microservice.name.split('/')
    switch (splittedName.length) {
      case 1: {
        microservice.name = splittedName[0]
        break
      }
      case 2: {
        microservice.name = splittedName[1]
        microservice.application = splittedName[0]
        break
      }
      default: {
        throw new Errors.ValidationError(`Invalid name ${microservice.name}`)
      }
    }
  }
  return microservice
}

const _deleteUndefinedFields = (obj) => Object.keys(obj).forEach(key => obj[key] === undefined && delete obj[key])

module.exports = {
  parseAppTemplateFile: parseAppTemplateFile,
  parseAppFile: parseAppFile,
  parseMicroserviceFile: parseMicroserviceFile
}
