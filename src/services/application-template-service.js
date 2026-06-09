/*
 * *******************************************************************************
 *  * Copyright (c) 2023 Datasance Teknoloji A.S.
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

const createApplicationTemplateEndPoint = async function (applicationTemplateData, isCLI, transaction) {
  // Add a name field to pass schema validation using the applicationCreate schema
  applicationTemplateData.application = { ...applicationTemplateData.application, name: 'validation' }
  await Validator.validate(applicationTemplateData, Validator.schemas.applicationTemplateCreate)
  // Remove name before storing
  delete applicationTemplateData.application.name

  await _checkForDuplicateName(applicationTemplateData.name, null, transaction)

  const applicationTemplateToCreate = {
    name: applicationTemplateData.name,
    description: applicationTemplateData.description,
    applicationJSON: JSON.stringify(applicationTemplateData.application)
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
    await deleteApplicationTemplateEndPoint({ name: applicationTemplate.name }, isCLI, transaction)
    throw e
  }
}

const deleteApplicationTemplateEndPoint = async function (conditions, isCLI, transaction) {
  const whereObj = {
    ...conditions
  }
  const where = AppHelper.deleteUndefinedFields(whereObj)

  await ApplicationTemplateManager.delete(where, transaction)
}

const patchApplicationTemplateEndPoint = async function (applicationTemplateData, conditions, isCLI, transaction) {
  await Validator.validate(applicationTemplateData, Validator.schemas.applicationTemplatePatch)

  const oldApplicationTemplate = await ApplicationTemplateManager.findOne({ ...conditions }, transaction)

  if (!oldApplicationTemplate) {
    throw new Errors.NotFoundError(ErrorMessages.INVALID_FLOW_ID)
  }
  if (applicationTemplateData.name) {
    await _checkForDuplicateName(applicationTemplateData.name, oldApplicationTemplate.id, transaction)
  }

  const applicationTemplate = {
    name: applicationTemplateData.name || conditions.name,
    description: applicationTemplateData.description
  }

  const updateApplicationTemplateData = AppHelper.deleteUndefinedFields(applicationTemplate)

  const where = isCLI
    ? { id: oldApplicationTemplate.id }
    : { id: oldApplicationTemplate.id }
  await ApplicationTemplateManager.update(where, updateApplicationTemplateData, transaction)
}

const updateApplicationTemplateEndPoint = async function (applicationTemplateData, name, isCLI, transaction) {
  // Add a name field to pass schema validation using the applicationCreate schema
  applicationTemplateData.application = { ...applicationTemplateData.application, name: 'validation' }
  await Validator.validate(applicationTemplateData, Validator.schemas.applicationTemplateUpdate)
  // Remove name before storing
  delete applicationTemplateData.application.name

  const oldApplicationTemplate = await ApplicationTemplateManager.findOne({ name }, transaction)

  if (!oldApplicationTemplate) {
    return createApplicationTemplateEndPoint({ ...applicationTemplateData, name }, isCLI, transaction)
  }
  if (applicationTemplateData.name) {
    await _checkForDuplicateName(applicationTemplateData.name, oldApplicationTemplate.id, transaction)
  }

  const applicationTemplateDBModel = {
    name: applicationTemplateData.name || name,
    description: applicationTemplateData.description,
    applicationJSON: JSON.stringify(applicationTemplateData.application)
  }

  const updateApplicationTemplateData = AppHelper.deleteUndefinedFields(applicationTemplateDBModel)
  const where = isCLI
    ? { id: oldApplicationTemplate.id }
    : { id: oldApplicationTemplate.id }
  await ApplicationTemplateManager.update(where, updateApplicationTemplateData, transaction)

  if (applicationTemplateData.variables) {
    await _updateVariables(oldApplicationTemplate.id, applicationTemplateData.variables, isCLI, transaction)
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

const _updateVariables = async function (applicationTemplateId, variables, isCLI, transaction) {
  await ApplicationTemplateVariableManager.delete({ applicationTemplateId }, transaction)
  for (const variableData of variables) {
    await _createVariable(applicationTemplateId, variableData, transaction)
  }
}

const getUserApplicationTemplatesEndPoint = async function (isCLI, transaction) {
  const application = {
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

async function getApplicationTemplate (conditions, isCLI, transaction) {
  const where = isCLI
    ? { ...conditions }
    : { ...conditions }
  const attributes = { exclude: ['created_at', 'updated_at'] }

  const application = await ApplicationTemplateManager.findOnePopulated(where, attributes, transaction)
  if (!application) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_APPLICATION_TEMPLATE_NAME, conditions.name || conditions.id))
  }
  return _buildGetApplicationObj(application)
}

const getApplicationTemplateEndPoint = async function (name, isCLI, transaction) {
  return getApplicationTemplate(name, isCLI, transaction)
}

const getApplicationDataFromTemplate = async function (deploymentData, isCLI, transaction) {
  await Validator.validate(deploymentData, Validator.schemas.applicationTemplateDeploy)

  const applicationTemplateDBObject = await ApplicationTemplateManager.findOnePopulated({ name: deploymentData.name }, transaction)
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

  for (const msvc of newApplication.microservices) {
    // Config is stored as a string, parse it to JSON before replacing values
    if (typeof msvc.config === typeof '' && msvc.config !== '') {
      msvc.config = JSON.parse(msvc.config)
    }
  }

  // default values are overwritten by user defined values, and self is always overwritten to the current object
  await rvaluesVarSubstition(newApplication, { ...defaultVariablesValues, ...userProvidedVariables, self: newApplication })

  for (const msvc of newApplication.microservices) {
    // Send it back as a string for application creation and validation
    if (typeof msvc.config === typeof {}) {
      msvc.config = JSON.stringify(msvc.config)
    }
  }

  return newApplication
}

const _checkForDuplicateName = async function (name, applicationId, transaction) {
  if (name) {
    const where = applicationId
      ? { name: name, id: { [Op.ne]: applicationId } }
      : { name: name }

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
  getApplicationDataFromTemplate
}
