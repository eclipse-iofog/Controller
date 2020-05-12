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
const Validator = require('../schemas')
const remove = require('lodash/remove')

const onlyUnique = (value, index, self) => self.indexOf(value) === index

const createApplicationEndPoint = async function (applicationData, user, isCLI, transaction) {
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

  if (applicationData.microservices) {
    for (const msvcData of applicationData.microservices) {
      await MicroserviceService.createMicroserviceEndPoint({ ...msvcData, application: application.name }, user, isCLI, transaction)
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
}

const deleteApplicationEndPoint = async function (name, user, isCLI, transaction) {
  const whereObj = {
    name: name,
    userId: user.id
  }
  const where = AppHelper.deleteUndefinedFields(whereObj)

  await _updateChangeTrackingsAndDeleteMicroservicesByApplicationId(name, true, transaction)

  await ApplicationManager.delete(where, transaction)
}

// Only patches the metadata (running, name, description, etc.)
const patchApplicationEndPoint = async function (applicationData, name, user, isCLI, transaction) {
  await Validator.validate(applicationData, Validator.schemas.applicationUpdate)

  const oldApplication = await ApplicationManager.findOne({ name, userId: user.id }, transaction)

  if (!oldApplication) {
    throw new Errors.NotFoundError(ErrorMessages.INVALID_FLOW_ID)
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

  if (oldApplication.isActivated !== applicationData.isActivated) {
    await _updateChangeTrackingsAndDeleteMicroservicesByApplicationId(name, false, transaction)
  }
}

// Updates the state (microservices, routes, etc.)
const updateApplicationEndPoint = async function (applicationData, name, user, isCLI, transaction) {
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
  const updatedApplication = await ApplicationManager.update(where, updateApplicationData, transaction)

  if (applicationData.microservices) {
    _updateMicroservices(updatedApplication, applicationData.microservices, user, isCLI, transaction)
  }
  if (applicationData.routes) {
    _updateRoutes(updatedApplication, applicationData.routes, user, isCLI, transaction)
  }

  if (oldApplication.isActivated !== applicationData.isActivated) {
    await _updateChangeTrackingsAndDeleteMicroservicesByApplicationId(name, false, transaction)
  }
}

const _updateRoutes = async function (application, routes, user, isCLI, transaction) {
  // Update routes
  const updatedRoutes = [...routes]
  const oldRoutes = await ApplicationManager.findApplicationRoutes({ name: application.name }, transaction)
  if (!oldRoutes) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_FLOW_ID, application.name))
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
  const oldMicroservices = await ApplicationManager.findApplicationMicroservices({ name: application.name }, transaction)
  if (!oldMicroservices) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_FLOW_ID, application.name))
  }
  const iofogUuids = []
  for (const oldMsvc of oldMicroservices) {
    const removed = remove(updatedMicroservices, (n) => oldMsvc.name === n.name)
    if (!removed.length) {
      await MicroserviceService.deleteMicroserviceWithRoutesAndPortMappings(oldMsvc, transaction)
      iofogUuids.push(oldMsvc.iofogUuid)
    } else {
      const updatedMsvc = removed[0]
      await MicroserviceService.updateMicroserviceEndPoint(oldMsvc.uuid, updatedMsvc, user, isCLI, transaction)
    }
  }
  // Create missing microservices
  for (const microservice of updatedMicroservices) {
    await MicroserviceService.createMicroserviceEndPoint({ ...microservice, application: application.name }, user, isCLI, transaction)
  }
  iofogUuids
    .filter(onlyUnique)
    .filter((val) => val !== null)
  for (const iofogUuid of iofogUuids) {
    await ChangeTrackingService.update(iofogUuid, ChangeTrackingService.events.microserviceFull, transaction)
  }
}

const getUserApplicationsEndPoint = async function (user, isCLI, transaction) {
  const application = {
    userId: user.id,
    isSystem: false
  }

  const attributes = { exclude: ['created_at', 'updated_at'] }
  const applications = await ApplicationManager.findAllPopulated(application, attributes, transaction)
  return {
    applications: applications
  }
}

const getAllApplicationsEndPoint = async function (isCLI, transaction) {
  const attributes = { exclude: ['created_at', 'updated_at'] }
  const applications = await ApplicationManager.findAllPopulated({}, attributes, transaction)
  return {
    applications: applications
  }
}

async function getApplication (name, user, isCLI, transaction) {
  const where = isCLI
    ? { name }
    : { name, userId: user.id }
  const attributes = { exclude: ['created_at', 'updated_at'] }

  const application = await ApplicationManager.findOnePopulated(where, attributes, transaction)
  if (!application) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_FLOW_ID, name))
  }
  return application
}

const getApplicationEndPoint = async function (name, user, isCLI, transaction) {
  return getApplication(name, user, isCLI, transaction)
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

async function _updateChangeTrackingsAndDeleteMicroservicesByApplicationId (name, deleteMicroservices, transaction) {
  const microservices = await ApplicationManager.findApplicationMicroservices({ name }, transaction)
  if (!microservices) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_FLOW_ID, name))
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

module.exports = {
  createApplicationEndPoint: TransactionDecorator.generateTransaction(createApplicationEndPoint),
  deleteApplicationEndPoint: TransactionDecorator.generateTransaction(deleteApplicationEndPoint),
  updateApplicationEndPoint: TransactionDecorator.generateTransaction(updateApplicationEndPoint),
  patchApplicationEndPoint: TransactionDecorator.generateTransaction(patchApplicationEndPoint),
  getUserApplicationsEndPoint: TransactionDecorator.generateTransaction(getUserApplicationsEndPoint),
  getAllApplicationsEndPoint: TransactionDecorator.generateTransaction(getAllApplicationsEndPoint),
  getApplicationEndPoint: TransactionDecorator.generateTransaction(getApplicationEndPoint),
  getApplicationByName: TransactionDecorator.generateTransaction(getApplicationEndPoint),
  getApplication: getApplication
}
