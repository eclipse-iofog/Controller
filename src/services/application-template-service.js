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
const { rvaluesVarSubstition } = require('../helpers/template-helper')

const ErrorMessages = require('../helpers/error-messages')
const Errors = require('../helpers/errors')
const ApplicationTemplateManager = require('../data/managers/application-template-manager')
const ApplicationTemplateVariableManager = require('../data/managers/application-template-variable-manager')
const TransactionDecorator = require('../decorators/transaction-decorator')
const Validator = require('../schemas')
const ApplicationService = require('./application-service')
const logger = require('../logger')

const createApplicationTemplateEndPoint = async function (applicationTemplateData, user, isCLI, transaction) {
  // Add a name field to pass schema validation using the applicationCreate schema
  applicationTemplateData.applicationJSON = { ...applicationTemplateData.applicationJSON, name: 'validation' }
  await Validator.validate(applicationTemplateData, Validator.schemas.applicationTemplateCreate)
  // Remove name before storing
  delete applicationTemplateData.applicationJSON.name

  await _checkForDuplicateName(applicationTemplateData.name, null, user.id, transaction)

  const applicationTemplateToCreate = {
    name: applicationTemplateData.name,
    description: applicationTemplateData.description,
    applicationJSON: JSON.stringify(applicationTemplateData.applicationJSON),
    userId: user.id
  }

  const applicationTemplateDataCreate = AppHelper.deleteUndefinedFields(applicationTemplateToCreate)

  const applicationTemplate = await ApplicationTemplateManager.create(applicationTemplateDataCreate, transaction)

  try {
    if (applicationTemplateData.variables) {
      for (const variableData of applicationTemplateData.variables) {
        await ApplicationTemplateVariableManager.create({ ...variableData, applicationTemplateId: applicationTemplate.id }, transaction)
      }
    }

    return {
      id: applicationTemplate.id,
      name: applicationTemplate.name
    }
  } catch (e) {
    // If anything failed during creating the application, delete all that was created
    await deleteApplicationTemplateEndPoint({ name: applicationTemplate.name }, user, isCLI, transaction)
    throw e
  }
}

const deleteApplicationTemplateEndPoint = async function (conditions, user, isCLI, transaction) {
  const whereObj = {
    ...conditions,
    userId: user.id
  }
  const where = AppHelper.deleteUndefinedFields(whereObj)

  await ApplicationTemplateManager.delete(where, transaction)
}

const patchApplicationTemplateEndPoint = async function (applicationTemplateData, conditions, user, isCLI, transaction) {
  await Validator.validate(applicationTemplateData, Validator.schemas.applicationTemplatePatch)

  const oldApplicationTemplate = await ApplicationTemplateManager.findOne({ ...conditions, userId: user.id }, transaction)

  if (!oldApplicationTemplate) {
    throw new Errors.NotFoundError(ErrorMessages.INVALID_FLOW_ID)
  }
  if (applicationTemplateData.name) {
    await _checkForDuplicateName(applicationTemplateData.name, oldApplicationTemplate.id, user.id || oldApplicationTemplate.userId, transaction)
  }

  const applicationTemplate = {
    name: applicationTemplateData.name || conditions.name,
    description: applicationTemplateData.description
  }

  const updateApplicationTemplateData = AppHelper.deleteUndefinedFields(applicationTemplate)

  const where = isCLI
    ? { id: oldApplicationTemplate.id }
    : { id: oldApplicationTemplate.id, userId: user.id }
  await ApplicationTemplateManager.update(where, updateApplicationTemplateData, transaction)
}

const updateApplicationTemplateEndPoint = async function (applicationTemplateData, name, user, isCLI, transaction) {
  // Add a name field to pass schema validation using the applicationCreate schema
  applicationTemplateData.applicationJSON = { ...applicationTemplateData.applicationJSON, name: 'validation' }
  await Validator.validate(applicationTemplateData, Validator.schemas.applicationTemplateUpdate)
  // Remove name before storing
  delete applicationTemplateData.applicationJSON.name

  const oldApplicationTemplate = await ApplicationTemplateManager.findOne({ name, userId: user.id }, transaction)

  if (!oldApplicationTemplate) {
    return createApplicationTemplateEndPoint({ ...applicationTemplateData, name }, user, isCLI, transaction)
  }
  if (applicationTemplateData.name) {
    await _checkForDuplicateName(applicationTemplateData.name, oldApplicationTemplate.id, user.id || oldApplicationTemplate.userId, transaction)
  }

  const applicationTemplate = {
    name: applicationTemplateData.name || name,
    description: applicationTemplateData.description,
    applicationJSON: JSON.stringify(applicationTemplateData.applicationJSON)
  }

  const updateApplicationTemplateData = AppHelper.deleteUndefinedFields(applicationTemplate)
  const where = isCLI
    ? { id: oldApplicationTemplate.id }
    : { id: oldApplicationTemplate.id, userId: user.id }
  await ApplicationTemplateManager.update(where, updateApplicationTemplateData, transaction)

  if (applicationTemplateData.variables) {
    await _updateVariables(oldApplicationTemplate.id, applicationTemplateData.variables, user, isCLI, transaction)
  }
}

const _updateVariables = async function (applicationTemplateId, variables, user, isCLI, transaction) {
  await ApplicationTemplateVariableManager.delete({ applicationTemplateId }, transaction)
  for (const variableData of variables) {
    await ApplicationTemplateVariableManager.create({ ...variableData, applicationTemplateId }, transaction)
  }
}

const getUserApplicationTemplatesEndPoint = async function (user, isCLI, transaction) {
  const application = {
    userId: user.id
  }

  const attributes = { exclude: ['created_at', 'updated_at'] }
  const applications = await ApplicationTemplateManager.findAllPopulated(application, attributes, transaction)
  return {
    applicationTemplates: applications.map(application => ({
      ...application.toJSON(), applicationJSON: JSON.parse(application.applicationJSON || null)
    }))
  }
}

const getAllApplicationTemplatesEndPoint = async function (isCLI, transaction) {
  const attributes = { exclude: ['created_at', 'updated_at'] }
  const applications = await ApplicationTemplateManager.findAllPopulated({}, attributes, transaction)
  return {
    applicationtemplates: applications.map(application => ({
      ...application.toJSON(), applicationJSON: JSON.parse(application.applicationJSON || null)
    }))
  }
}

async function getApplicationTemplate (conditions, user, isCLI, transaction) {
  const where = isCLI
    ? { ...conditions }
    : { ...conditions, userId: user.id }
  const attributes = { exclude: ['created_at', 'updated_at'] }

  const application = await ApplicationTemplateManager.findOnePopulated(where, attributes, transaction)
  if (!application) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_APPLICATION_TEMPLATE_NAME, conditions.name || conditions.id))
  }
  const JSONData = application.toJSON()
  JSONData.applicationJSON = JSON.parse(JSONData.applicationJSON || null)
  return JSONData
}

const getApplicationTemplateEndPoint = async function (name, user, isCLI, transaction) {
  return getApplicationTemplate(name, user, isCLI, transaction)
}

const deployApplicationTemplateEndPoint = async function (applicationData, templateName, user, isCLI, transaction) {
  await Validator.validate(applicationData, Validator.schemas.applicationTemplateDeploy)

  const applicationTemplateDBObject = await ApplicationTemplateManager.findOnePopulated({ name: templateName, userId: user.id }, transaction)
  if (!applicationTemplateDBObject) {
    throw new Errors.NotFoundError(ErrorMessages.INVALID_APPLICATION_TEMPLATE_NAME, templateName)
  }
  const applicationTemplate = applicationTemplateDBObject.toJSON()
  applicationTemplate.applicationJSON = JSON.parse(applicationTemplate.applicationJSON || null)
  if (!applicationTemplate.applicationJSON) {
    throw new Errors.ValidationError(ErrorMessages.APPLICATION_TEMPLATE_INVALID, templateName)
  }

  const newApplication = { ...applicationTemplate.applicationJSON, ...applicationData }

  // Replace variables
  const defaultVariablesValues = (applicationTemplate.variables || []).reduce((acc, v) => {
    return { ...acc, [v.key]: v.defaultValue }
  }, {})
  const userProvidedVariables = (applicationData.variables || []).reduce((acc, v) => {
    return { ...acc, [v.key]: v.value }
  }, {})

  // default values are overwritten by user defined values, and self is always overwritten to the current object
  await rvaluesVarSubstition(newApplication, { ...defaultVariablesValues, ...userProvidedVariables, self: newApplication })

  // Edit names - Until name scoping is added
  for (const microservice of newApplication.microservices) {
    microservice.name = `${microservice.name}-${applicationData.name}`
  }
  for (const route of newApplication.routes) {
    route.name = `${route.name}-${applicationData.name}`
    route.from = `${route.from}-${applicationData.name}`
    route.to = `${route.to}-${applicationData.name}`
  }

  logger.info(JSON.stringify(newApplication))

  // Use ApplicationService to create the application from the templated data
  return ApplicationService.createApplicationEndPoint(newApplication, user, isCLI, transaction)
}

const _checkForDuplicateName = async function (name, applicationId, userId, transaction) {
  if (name) {
    const where = applicationId
      ? { name: name, userId: userId, id: { [Op.ne]: applicationId } }
      : { name: name, userId: userId }

    const result = await ApplicationTemplateManager.findOne(where, transaction)
    if (result) {
      throw new Errors.DuplicatePropertyError(AppHelper.formatMessage(ErrorMessages.DUPLICATE_NAME, name))
    }
  }
}

module.exports = {
  createApplicationTemplateEndPoint: TransactionDecorator.generateTransaction(createApplicationTemplateEndPoint),
  deleteApplicationTemplateEndPoint: TransactionDecorator.generateTransaction(deleteApplicationTemplateEndPoint),
  updateApplicationTemplateEndPoint: TransactionDecorator.generateTransaction(updateApplicationTemplateEndPoint),
  patchApplicationTemplateEndPoint: TransactionDecorator.generateTransaction(patchApplicationTemplateEndPoint),
  getUserApplicationTemplatesEndPoint: TransactionDecorator.generateTransaction(getUserApplicationTemplatesEndPoint),
  getAllApplicationTemplatesEndPoint: TransactionDecorator.generateTransaction(getAllApplicationTemplatesEndPoint),
  getApplicationTemplateEndPoint: TransactionDecorator.generateTransaction(getApplicationTemplateEndPoint),
  getApplicationTemplateByName: TransactionDecorator.generateTransaction(getApplicationTemplateEndPoint),
  getApplicationTemplate: getApplicationTemplate,
  deployApplicationTemplateEndPoint: TransactionDecorator.generateTransaction(deployApplicationTemplateEndPoint)
}
