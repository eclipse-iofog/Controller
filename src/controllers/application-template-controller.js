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

const AuthDecorator = require('./../decorators/authorization-decorator')
const ApplicationTemplateService = require('../services/application-template-service')
const errors = require('../helpers/errors')
const ErrorMessages = require('../helpers/error-messages')
const { rvaluesVarSubstition } = require('../helpers/template-helper')

const createApplicationTemplateEndPoint = async function (req, user) {
  const application = req.body

  return ApplicationTemplateService.createApplicationTemplateEndPoint(application, user, false)
}

const createApplicationTemplateYAMLEndPoint = async function (req, user) {
  if (!req.file) {
    throw new errors.ValidationError(ErrorMessages.APPLICATION_FILE_NOT_FOUND)
  }
  const fileContent = req.file.buffer.toString()
  const application = await ApplicationTemplateService.parseYAMLFile(fileContent)
  await rvaluesVarSubstition(application.variables, { self: application.variables }, user)

  return ApplicationTemplateService.createApplicationTemplateEndPoint(application, user, false)
}

const getApplicationTemplatesByUserEndPoint = async function (req, user) {
  return ApplicationTemplateService.getUserApplicationTemplatesEndPoint(user, false)
}

const getApplicationTemplateEndPoint = async function (req, user) {
  const name = req.params.name

  return ApplicationTemplateService.getApplicationTemplateEndPoint({ name }, user, false)
}

const patchApplicationTemplateEndPoint = async function (req, user) {
  const application = req.body
  const name = req.params.name

  return ApplicationTemplateService.patchApplicationTemplateEndPoint(application, { name }, user, false)
}

const updateApplicationTemplateEndPoint = async function (req, user) {
  const application = req.body
  const name = req.params.name

  return ApplicationTemplateService.updateApplicationTemplateEndPoint(application, name, user, false)
}

const updateApplicationTemplateYAMLEndPoint = async function (req, user) {
  if (!req.file) {
    throw new errors.ValidationError(ErrorMessages.APPLICATION_FILE_NOT_FOUND)
  }
  const name = req.params.name
  const fileContent = req.file.buffer.toString()
  const application = await ApplicationTemplateService.parseYAMLFile(fileContent)
  await rvaluesVarSubstition(application.variables, { self: application.variables }, user)

  return ApplicationTemplateService.updateApplicationTemplateEndPoint(application, name, user, false)
}

const deleteApplicationTemplateEndPoint = async function (req, user) {
  const name = req.params.name

  return ApplicationTemplateService.deleteApplicationTemplateEndPoint({ name }, user, false)
}

module.exports = {
  createApplicationTemplateEndPoint: AuthDecorator.checkAuthToken(createApplicationTemplateEndPoint),
  getApplicationTemplatesByUserEndPoint: AuthDecorator.checkAuthToken(getApplicationTemplatesByUserEndPoint),
  getApplicationTemplateEndPoint: AuthDecorator.checkAuthToken(getApplicationTemplateEndPoint),
  updateApplicationTemplateEndPoint: AuthDecorator.checkAuthToken(updateApplicationTemplateEndPoint),
  updateApplicationTemplateYAMLEndPoint: AuthDecorator.checkAuthToken(updateApplicationTemplateYAMLEndPoint),
  patchApplicationTemplateEndPoint: AuthDecorator.checkAuthToken(patchApplicationTemplateEndPoint),
  deleteApplicationTemplateEndPoint: AuthDecorator.checkAuthToken(deleteApplicationTemplateEndPoint),
  createApplicationTemplateYAMLEndPoint: AuthDecorator.checkAuthToken(createApplicationTemplateYAMLEndPoint)
}
