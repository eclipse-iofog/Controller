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

const ApplicationTemplateService = require('../services/application-template-service')
const YAMLParserService = require('../services/yaml-parser-service')
const errors = require('../helpers/errors')
const ErrorMessages = require('../helpers/error-messages')
const { rvaluesVarSubstition } = require('../helpers/template-helper')

const createApplicationTemplateEndPoint = async function (req) {
  const application = req.body

  return ApplicationTemplateService.createApplicationTemplateEndPoint(application, false)
}

const createApplicationTemplateYAMLEndPoint = async function (req) {
  if (!req.file) {
    throw new errors.ValidationError(ErrorMessages.APPLICATION_FILE_NOT_FOUND)
  }
  const fileContent = req.file.buffer.toString()
  const application = await YAMLParserService.parseAppTemplateFile(fileContent)
  await rvaluesVarSubstition(application.variables, { self: application.variables })

  return ApplicationTemplateService.createApplicationTemplateEndPoint(application, false)
}

const getApplicationTemplatesByUserEndPoint = async function (req) {
  return ApplicationTemplateService.getUserApplicationTemplatesEndPoint(false)
}

const getApplicationTemplateEndPoint = async function (req) {
  const name = req.params.name

  return ApplicationTemplateService.getApplicationTemplateEndPoint({ name }, false)
}

const patchApplicationTemplateEndPoint = async function (req) {
  const application = req.body
  const name = req.params.name

  return ApplicationTemplateService.patchApplicationTemplateEndPoint(application, { name }, false)
}

const updateApplicationTemplateEndPoint = async function (req) {
  const application = req.body
  const name = req.params.name

  return ApplicationTemplateService.updateApplicationTemplateEndPoint(application, name, false)
}

const updateApplicationTemplateYAMLEndPoint = async function (req) {
  if (!req.file) {
    throw new errors.ValidationError(ErrorMessages.APPLICATION_FILE_NOT_FOUND)
  }
  const name = req.params.name
  const fileContent = req.file.buffer.toString()
  const application = await YAMLParserService.parseAppTemplateFile(fileContent)
  await rvaluesVarSubstition(application.variables, { self: application.variables })

  return ApplicationTemplateService.updateApplicationTemplateEndPoint(application, name, false)
}

const deleteApplicationTemplateEndPoint = async function (req) {
  const name = req.params.name

  return ApplicationTemplateService.deleteApplicationTemplateEndPoint({ name }, false)
}

module.exports = {
  createApplicationTemplateEndPoint: (createApplicationTemplateEndPoint),
  getApplicationTemplatesByUserEndPoint: (getApplicationTemplatesByUserEndPoint),
  getApplicationTemplateEndPoint: (getApplicationTemplateEndPoint),
  updateApplicationTemplateEndPoint: (updateApplicationTemplateEndPoint),
  updateApplicationTemplateYAMLEndPoint: (updateApplicationTemplateYAMLEndPoint),
  patchApplicationTemplateEndPoint: (patchApplicationTemplateEndPoint),
  deleteApplicationTemplateEndPoint: (deleteApplicationTemplateEndPoint),
  createApplicationTemplateYAMLEndPoint: (createApplicationTemplateYAMLEndPoint)
}
