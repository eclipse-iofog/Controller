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
const ApplicationService = require('./application-service')
const Validator = require('../schemas')
const lget = require('lodash/get')
const yaml = require('js-yaml')

const createApplicationTemplateEndPoint = async function (applicationTemplateData, user, isCLI, transaction) {
  // Add a name field to pass schema validation using the applicationCreate schema
  applicationTemplateData.application = { ...applicationTemplateData.application, name: 'validation' }
  await Validator.validate(applicationTemplateData, Validator.schemas.applicationTemplateCreate)
  // Remove name before storing
  delete applicationTemplateData.application.name

  await _checkForDuplicateName(applicationTemplateData.name, null, user.id, transaction)

  const applicationTemplateToCreate = {
    name: applicationTemplateData.name,
    description: applicationTemplateData.description,
    applicationJSON: JSON.stringify(applicationTemplateData.application),
    userId: user.id
  }

  const applicationTemplateDataCreate = AppHelper.deleteUndefinedFields(applicationTemplateToCreate)

  const applicationTemplate = await ApplicationTemplateManager.create(applicationTemplateDataCreate, transaction)

  try {
    if (applicationTemplateData.variables) {
      for (const variableData of applicationTemplateData.variables) {
        await _createVariable(applicationTemplate.id, variableData, transaction)
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
  applicationTemplateData.application = { ...applicationTemplateData.application, name: 'validation' }
  await Validator.validate(applicationTemplateData, Validator.schemas.applicationTemplateUpdate)
  // Remove name before storing
  delete applicationTemplateData.application.name

  const oldApplicationTemplate = await ApplicationTemplateManager.findOne({ name, userId: user.id }, transaction)

  if (!oldApplicationTemplate) {
    return createApplicationTemplateEndPoint({ ...applicationTemplateData, name }, user, isCLI, transaction)
  }
  if (applicationTemplateData.name) {
    await _checkForDuplicateName(applicationTemplateData.name, oldApplicationTemplate.id, user.id || oldApplicationTemplate.userId, transaction)
  }

  const applicationTemplateDBModel = {
    name: applicationTemplateData.name || name,
    description: applicationTemplateData.description,
    applicationJSON: JSON.stringify(applicationTemplateData.application)
  }

  const updateApplicationTemplateData = AppHelper.deleteUndefinedFields(applicationTemplateDBModel)
  const where = isCLI
    ? { id: oldApplicationTemplate.id }
    : { id: oldApplicationTemplate.id, userId: user.id }
  await ApplicationTemplateManager.update(where, updateApplicationTemplateData, transaction)

  if (applicationTemplateData.variables) {
    await _updateVariables(oldApplicationTemplate.id, applicationTemplateData.variables, user, isCLI, transaction)
  }

  return {
    id: oldApplicationTemplate.id,
    name: applicationTemplateDBModel.name
  }
}

const _createVariable = async function (applicationTemplateId, variableData, transaction) {
  const newVariable = {
    ...variableData
  }

  // Store default value as a JSON stringified version to allow dynamic typing
  if (newVariable.defaultValue !== undefined) {
    newVariable.defaultValue = JSON.stringify(newVariable.defaultValue)
  }

  return ApplicationTemplateVariableManager.create({ ...newVariable, applicationTemplateId }, transaction)
}

const _updateVariables = async function (applicationTemplateId, variables, user, isCLI, transaction) {
  await ApplicationTemplateVariableManager.delete({ applicationTemplateId }, transaction)
  for (const variableData of variables) {
    await _createVariable(applicationTemplateId, variableData, transaction)
  }
}

const getUserApplicationTemplatesEndPoint = async function (user, isCLI, transaction) {
  const application = {
    userId: user.id
  }

  const attributes = { exclude: ['created_at', 'updated_at'] }
  const applications = await ApplicationTemplateManager.findAllPopulated(application, attributes, transaction)
  return {
    applicationTemplates: applications.map(application => AppHelper.deleteUndefinedFields({
      ...application.toJSON(), application: JSON.parse(application.applicationJSON || null), applicationJSON: undefined
    }))
  }
}

const _buildGetApplicationObj = function (applicationDBObj) {
  const JSONData = applicationDBObj.toJSON()
  JSONData.application = JSON.parse(JSONData.applicationJSON || null)
  JSONData.variables = (JSONData.variables || []).map(v => {
    if (v.defaultValue === undefined) { return v }
    return {
      ...v, defaultValue: JSON.parse(v.defaultValue)
    }
  })
  delete JSONData.applicationJSON
  return JSONData
}

const getAllApplicationTemplatesEndPoint = async function (isCLI, transaction) {
  const attributes = { exclude: ['created_at', 'updated_at'] }
  const applications = await ApplicationTemplateManager.findAllPopulated({}, attributes, transaction)
  return {
    applicationTemplates: applications.map(_buildGetApplicationObj)
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
  return _buildGetApplicationObj(application)
}

const getApplicationTemplateEndPoint = async function (name, user, isCLI, transaction) {
  return getApplicationTemplate(name, user, isCLI, transaction)
}

const getApplicationDataFromTemplate = async function (deploymentData, user, isCLI, transaction) {
  await Validator.validate(deploymentData, Validator.schemas.applicationTemplateDeploy)

  const applicationTemplateDBObject = await ApplicationTemplateManager.findOnePopulated({ name: deploymentData.name, userId: user.id }, transaction)
  if (!applicationTemplateDBObject) {
    throw new Errors.NotFoundError(ErrorMessages.INVALID_APPLICATION_TEMPLATE_NAME, deploymentData.name)
  }
  const applicationTemplate = applicationTemplateDBObject.toJSON()
  applicationTemplate.application = JSON.parse(applicationTemplate.applicationJSON || null)
  if (!applicationTemplate.application) {
    throw new Errors.ValidationError(ErrorMessages.APPLICATION_TEMPLATE_INVALID, deploymentData.name)
  }

  const newApplication = applicationTemplate.application

  // Replace variables
  const defaultVariablesValues = (applicationTemplate.variables || []).reduce((acc, v) => {
    return { ...acc, [v.key]: JSON.parse(v.defaultValue) }
  }, {})
  const userProvidedVariables = (deploymentData.variables || []).reduce((acc, v) => {
    return { ...acc, [v.key]: v.value }
  }, {})
  delete newApplication.variables

  // default values are overwritten by user defined values, and self is always overwritten to the current object
  await rvaluesVarSubstition(newApplication, { ...defaultVariablesValues, ...userProvidedVariables, self: newApplication }, user)

  return newApplication
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

function parseYAMLFile (fileContent) {
  const doc = yaml.load(fileContent)
  if (doc.kind !== 'ApplicationTemplate') {
    throw new Errors.ValidationError(`Invalid kind ${doc.kind}`)
  }
  if (doc.metadata == null || doc.spec == null) {
    throw new Errors.ValidationError('Invalid YAML format')
  }
  const appTemplate = {
    name: lget(doc, 'metadata.name', undefined),
    applicationJSON: ApplicationService.parseYAMLFile(doc.spec.application),
    description: doc.spec.description,
    variables: doc.spec.variables
  }
  _deleteUndefinedFields(appTemplate)
  return appTemplate
}

const _deleteUndefinedFields = (obj) => Object.keys(obj).forEach(key => obj[key] === undefined && delete obj[key])

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
  getApplicationDataFromTemplate,
  parseYAMLFile: parseYAMLFile
}
