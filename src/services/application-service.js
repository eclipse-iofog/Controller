/*
 * *******************************************************************************
 *  * Copyright (c) 2020 Edgeworx, Inc.
 *  *
 *  * This program and the accompanying materials are made available under the
 *  * terms of the Eclipse Public License v. 2.0 which is available at
 *  * http://www.eclipse.org/legal/epl-2.0
 *  *
 *  * SPDX-License-Identifier: EPL-2.0
 *  *******************************************************************************
 *
 */

const Sequelize = require('sequelize')
const Op = Sequelize.Op

const AppHelper = require('../helpers/app-helper')
const ChangeTrackingService = require('./change-tracking-service')
const ErrorMessages = require('../helpers/error-messages')
const Errors = require('../helpers/errors')
const MicroserviceService = require('./microservices-service')
const RoutingService = require('./routing-service')
const ApplicationManager = require('../data/managers/application-manager')
const TransactionDecorator = require('../decorators/transaction-decorator')
const ApplicationTemplateService = require('./application-template-service')
const Validator = require('../schemas')
const remove = require('lodash/remove')
const lget = require('lodash/get')
const yaml = require('js-yaml')

const onlyUnique = (value, index, self) => self.indexOf(value) === index

const createApplicationEndPoint = async function (applicationData, user, isCLI, transaction) {
  // if template is provided, use template data
  if (applicationData.template && applicationData.template.name) {
    applicationData = {
      ...await ApplicationTemplateService.getApplicationDataFromTemplate(applicationData.template, user, isCLI, transaction),
      isSystem: applicationData.isSystem,
      name: applicationData.name,
      description: applicationData.description,
      isActivated: applicationData.isActivated
    }
    // Edit names - Until name scoping is added
    for (const microservice of applicationData.microservices) {
      microservice.name = `${microservice.name}-${applicationData.name}`
    }
    for (const route of applicationData.routes) {
      route.name = `${route.name}-${applicationData.name}`
      route.from = `${route.from}-${applicationData.name}`
      route.to = `${route.to}-${applicationData.name}`
    }
  }

  // Set the application field
  if (applicationData.microservices) {
    applicationData.microservices = applicationData.microservices.map(m => ({
      ...m,
      application: applicationData.name
    }))
  }
  if (applicationData.routes) {
    applicationData.routes = applicationData.routes.map(r => ({
      ...r,
      name: r.name || `r-${r.from}-${r.to}`,
      application: applicationData.name
    }))
  }
  await Validator.validate(applicationData, Validator.schemas.applicationCreate)

  await _checkForDuplicateName(applicationData.name, null, user.id, transaction)

  const applicationToCreate = {
    name: applicationData.name,
    description: applicationData.description,
    isActivated: !!applicationData.isActivated,
    isSystem: !!applicationData.isSystem,
    userId: user.id
  }

  const applicationDataCreate = AppHelper.deleteUndefinedFields(applicationToCreate)

  const application = await ApplicationManager.create(applicationDataCreate, transaction)

  try {
    if (applicationData.microservices) {
      for (const msvcData of applicationData.microservices) {
        await MicroserviceService.createMicroserviceEndPoint(msvcData, user, isCLI, transaction)
      }
    }

    if (applicationData.routes) {
      for (const routeData of applicationData.routes) {
        await RoutingService.createRouting(routeData, user, isCLI, transaction)
      }
    }

    return {
      id: application.id,
      name: application.name
    }
  } catch (e) {
    // If anything failed during creating the application, delete all that was created
    await deleteApplicationEndPoint({ name: application.name }, user, isCLI, transaction)
    throw e
  }
}

const deleteApplicationEndPoint = async function (conditions, user, isCLI, transaction) {
  const whereObj = {
    ...conditions,
    userId: user.id
  }
  const where = AppHelper.deleteUndefinedFields(whereObj)

  await _updateChangeTrackingsAndDeleteMicroservicesByApplicationId(conditions, true, transaction)

  await ApplicationManager.delete(where, transaction)
}

// Only patches the metadata (running, name, description, etc.)
const patchApplicationEndPoint = async function (applicationData, conditions, user, isCLI, transaction) {
  await Validator.validate(applicationData, Validator.schemas.applicationPatch)

  const oldApplication = await ApplicationManager.findOne({ ...conditions, userId: user.id }, transaction)

  if (!oldApplication) {
    throw new Errors.NotFoundError(ErrorMessages.INVALID_FLOW_ID)
  }
  if (applicationData.name) {
    await _checkForDuplicateName(applicationData.name, oldApplication.id, user.id || oldApplication.userId, transaction)
  }

  const application = {
    name: applicationData.name || conditions.name,
    description: applicationData.description,
    isActivated: applicationData.isActivated,
    isSystem: applicationData.isSystem
  }

  const updateApplicationData = AppHelper.deleteUndefinedFields(application)

  const where = isCLI
    ? { id: oldApplication.id }
    : { id: oldApplication.id, userId: user.id }
  await ApplicationManager.update(where, updateApplicationData, transaction)

  if (oldApplication.isActivated !== applicationData.isActivated) {
    await _updateChangeTrackingsAndDeleteMicroservicesByApplicationId(conditions, false, transaction)
  }
}

// Updates the state (microservices, routes, etc.)
const updateApplicationEndPoint = async function (applicationData, name, user, isCLI, transaction) {
  // if template is provided, use template data
  if (applicationData.template && applicationData.template.name) {
    applicationData = {
      ...await ApplicationTemplateService.getApplicationDataFromTemplate(applicationData.template, user, isCLI, transaction),
      isSystem: applicationData.isSystem,
      name: applicationData.name || name,
      description: applicationData.description,
      isActivated: applicationData.isActivated
    }
    // Edit names - Until name scoping is added
    for (const microservice of applicationData.microservices) {
      microservice.name = `${microservice.name}-${applicationData.name}`
    }
    for (const route of applicationData.routes) {
      route.name = `${route.name}-${applicationData.name}`
      route.from = `${route.from}-${applicationData.name}`
      route.to = `${route.to}-${applicationData.name}`
    }
  }

  if (applicationData.microservices) {
    applicationData.microservices = applicationData.microservices.map(m => ({
      ...m,
      application: applicationData.name || name
    }))
  }
  if (applicationData.routes) {
    applicationData.routes = applicationData.routes.map(r => ({
      ...r,
      name: r.name || `r-${r.from}-${r.to}`,
      application: applicationData.name || name
    }))
  }

  await Validator.validate(applicationData, Validator.schemas.applicationUpdate)

  const oldApplication = await ApplicationManager.findOne({ name, userId: user.id }, transaction)

  if (!oldApplication) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_FLOW_ID, name))
  }
  if (applicationData.name) {
    await _checkForDuplicateName(applicationData.name, oldApplication.id, user.id || oldApplication.userId, transaction)
  }

  const application = {
    name: applicationData.name || name,
    description: applicationData.description,
    isActivated: applicationData.isActivated,
    isSystem: applicationData.isSystem
  }

  const updateApplicationData = AppHelper.deleteUndefinedFields(application)
  const where = isCLI
    ? { id: oldApplication.id }
    : { id: oldApplication.id, userId: user.id }
  await ApplicationManager.update(where, updateApplicationData, transaction)

  if (applicationData.microservices) {
    await _updateMicroservices(application.name, applicationData.microservices, user, isCLI, transaction)
  }
  if (applicationData.routes) {
    await _updateRoutes(application.name, applicationData.routes, user, isCLI, transaction)
  }

  if (oldApplication.isActivated !== applicationData.isActivated) {
    await _updateChangeTrackingsAndDeleteMicroservicesByApplicationId({ name }, false, transaction)
  }
}

const _updateRoutes = async function (application, routes, user, isCLI, transaction) {
  // Update routes
  const updatedRoutes = [...routes]
  const oldRoutes = await ApplicationManager.findApplicationRoutes({ name: application }, transaction)
  if (!oldRoutes) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_FLOW_ID, application))
  }
  for (const oldRoute of oldRoutes) {
    const removed = remove(updatedRoutes, (n) => oldRoute.name === n.name)
    if (!removed.length) {
      await RoutingService.deleteRouting(oldRoute.name, user, isCLI, transaction)
    } else {
      const updatedRoute = removed[0]
      await RoutingService.updateRouting(updatedRoute.name, updatedRoute, user, isCLI, transaction)
    }
  }
  // Create missing routes
  for (const route of updatedRoutes) {
    await RoutingService.createRouting(route, user, isCLI, transaction)
  }
}

const _updateMicroservices = async function (application, microservices, user, isCLI, transaction) {
  const updatedMicroservices = [...microservices]
  // Update microservices
  const oldMicroservices = await ApplicationManager.findApplicationMicroservices({ name: application }, transaction)
  if (!oldMicroservices) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_FLOW_ID, application))
  }
  const iofogUuids = []
  const oldMsvcsIofogUuids = []
  const updatedMsvcsUuid = []
  for (const oldMsvc of oldMicroservices) {
    const removed = remove(updatedMicroservices, (n) => oldMsvc.name === n.name)
    if (!removed.length) {
      await MicroserviceService.deleteMicroserviceWithRoutesAndPortMappings(oldMsvc, transaction)
      iofogUuids.push(oldMsvc.iofogUuid)
    } else {
      const updatedMsvc = removed[0]
      const updatedMicroservices = await MicroserviceService.updateMicroserviceEndPoint(oldMsvc.uuid, updatedMsvc, user, isCLI, transaction, false)
      oldMsvcsIofogUuids.push(updatedMicroservices.microserviceIofogUuid)
      updatedMsvcsUuid.push(updatedMicroservices.updatedMicroserviceIofogUuid)
    }
  }
  // Create missing microservices
  for (const microservice of updatedMicroservices) {
    await MicroserviceService.createMicroserviceEndPoint(microservice, user, isCLI, transaction)
  }
  iofogUuids
    .filter(onlyUnique)
    .filter((val) => val !== null)
  for (const iofogUuid of iofogUuids) {
    await ChangeTrackingService.update(iofogUuid, ChangeTrackingService.events.microserviceFull, transaction)
  }
  oldMsvcsIofogUuids
    .filter(onlyUnique)
    .filter((val) => val !== null)
    .forEach(async (iofogUuid) => {
      await ChangeTrackingService.update(iofogUuid, ChangeTrackingService.events.microserviceRouting, transaction)
      await MicroserviceService._updateChangeTracking(true, iofogUuid, transaction)
    })

  updatedMsvcsUuid
    .filter(onlyUnique)
    .filter((val) => val !== null)
    .forEach(async (iofogUuid) => {
      await ChangeTrackingService.update(iofogUuid, ChangeTrackingService.events.microserviceRouting, transaction)
      await MicroserviceService._updateChangeTracking(true, iofogUuid, transaction)
    })
}

const getUserApplicationsEndPoint = async function (user, isCLI, transaction) {
  const application = {
    userId: user.id,
    isSystem: false
  }

  const attributes = { exclude: ['created_at', 'updated_at'] }
  const applications = await ApplicationManager.findAllPopulated(application, attributes, transaction)

  return {
    applications: await Promise.all(applications.map(async (app) => _buildApplicationObject(app, transaction)))
  }
}

const getAllApplicationsEndPoint = async function (isCLI, transaction) {
  const attributes = { exclude: ['created_at', 'updated_at'] }
  const applications = await ApplicationManager.findAllPopulated({}, attributes, transaction)

  return {
    applications: await Promise.all(applications.map(async (app) => _buildApplicationObject(app, transaction)))
  }
}

async function _buildApplicationObject (application, transaction) {
  application.microservices = await Promise.all(application.microservices.map(async (m) => MicroserviceService.buildGetMicroserviceResponse(m.dataValues || m, transaction)))
  return application
}

async function getApplication (conditions, user, isCLI, transaction) {
  const where = isCLI
    ? { ...conditions }
    : { ...conditions, userId: user.id }
  const attributes = { exclude: ['created_at', 'updated_at'] }

  const applicationRaw = await ApplicationManager.findOnePopulated(where, attributes, transaction)
  if (!applicationRaw) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_FLOW_ID, conditions.name || conditions.id))
  }
  const application = await _buildApplicationObject(applicationRaw, transaction)
  return application
}

const getApplicationEndPoint = async function (conditions, user, isCLI, transaction) {
  const application = await getApplication(conditions, user, isCLI, transaction)
  return application
}

const _checkForDuplicateName = async function (name, applicationId, userId, transaction) {
  if (name) {
    const where = applicationId
      ? { name: name, userId: userId, id: { [Op.ne]: applicationId } }
      : { name: name, userId: userId }

    const result = await ApplicationManager.findOne(where, transaction)
    if (result) {
      throw new Errors.DuplicatePropertyError(AppHelper.formatMessage(ErrorMessages.DUPLICATE_NAME, name))
    }
  }
}

async function _updateChangeTrackingsAndDeleteMicroservicesByApplicationId (conditions, deleteMicroservices, transaction) {
  const microservices = await ApplicationManager.findApplicationMicroservices(conditions, transaction)
  if (!microservices) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_FLOW_NAME, conditions.name || conditions.id))
  }
  const iofogUuids = []
  for (const ms of microservices) {
    if (deleteMicroservices) {
      await MicroserviceService.deleteMicroserviceWithRoutesAndPortMappings(ms, transaction)
    }
    iofogUuids.push(ms.iofogUuid)
  }
  iofogUuids
    .filter(onlyUnique)
    .filter((val) => val !== null)
  for (const iofogUuid of iofogUuids) {
    await ChangeTrackingService.update(iofogUuid, ChangeTrackingService.events.microserviceFull, transaction)
  }
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

const _deleteUndefinedFields = (obj) => Object.keys(obj).forEach(key => obj[key] === undefined && delete obj[key])

const parseMicroservice = async (microservice) => {
  const { registryId, catalogItemId, images } = await parseMicroserviceImages(microservice.images)
  const microserviceData = {
    config: microservice.config != null ? JSON.stringify(microservice.config) : undefined,
    name: microservice.name,
    catalogItemId,
    agentName: lget(microservice, 'agent.name'),
    registryId,
    ...microservice.container,
    ports: (lget(microservice, 'container.ports', [])).map(p => ({ ...p, publicPort: p.public })),
    volumeMappings: lget(microservice, 'container.volumes', []),
    cmd: lget(microservice, 'container.commands', []),
    env: (lget(microservice, 'container.env', [])).map(e => ({ key: e.key.toString(), value: e.value.toString() })),
    images,
    extraHosts: lget(microservice, 'container.extraHosts', [])
  }
  _deleteUndefinedFields(microserviceData)
  return microserviceData
}

async function parseYAMLFile (fileContent) {
  const doc = yaml.load(fileContent)
  if (doc.kind !== 'Application') {
    throw new Errors.ValidationError(`Invalid kind ${doc.kind}`)
  }
  if (doc.metadata == null || doc.spec == null) {
    throw new Errors.ValidationError('Invalid YAML format')
  }
  const application = {
    name: lget(doc, 'metadata.name', undefined),
    ...doc.spec,
    isActivated: doc.spec.isActivated || true,
    microservices: await Promise.all((doc.spec.microservices || []).map(async (m) => parseMicroservice(m)))
  }
  return application
}

module.exports = {
  createApplicationEndPoint: TransactionDecorator.generateTransaction(createApplicationEndPoint),
  deleteApplicationEndPoint: TransactionDecorator.generateTransaction(deleteApplicationEndPoint),
  updateApplicationEndPoint: TransactionDecorator.generateTransaction(updateApplicationEndPoint),
  patchApplicationEndPoint: TransactionDecorator.generateTransaction(patchApplicationEndPoint),
  getUserApplicationsEndPoint: TransactionDecorator.generateTransaction(getUserApplicationsEndPoint),
  getAllApplicationsEndPoint: TransactionDecorator.generateTransaction(getAllApplicationsEndPoint),
  getApplicationEndPoint: TransactionDecorator.generateTransaction(getApplicationEndPoint),
  getApplication: getApplication,
  parseYAMLFile: parseYAMLFile
}
