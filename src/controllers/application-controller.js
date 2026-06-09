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

const ApplicationService = require('../services/application-service')
const YAMLParserService = require('../services/yaml-parser-service')
const errors = require('../helpers/errors')
const ErrorMessages = require('../helpers/error-messages')
const { rvaluesVarSubstition } = require('../helpers/template-helper')

const createApplicationEndPoint = async function (req) {
  const application = req.body

  return ApplicationService.createApplicationEndPoint(application, false)
}

const createApplicationYAMLEndPoint = async function (req) {
  if (!req.file) {
    throw new errors.ValidationError(ErrorMessages.APPLICATION_FILE_NOT_FOUND)
  }
  const fileContent = req.file.buffer.toString()
  const application = await YAMLParserService.parseAppFile(fileContent)
  await rvaluesVarSubstition(application, { self: application })

  return ApplicationService.createApplicationEndPoint(application, false)
}

const getApplicationsByUserEndPoint = async function (req) {
  return ApplicationService.getUserApplicationsEndPoint(false)
}

const getApplicationsBySystemEndPoint = async function (req) {
  return ApplicationService.getSystemApplicationsEndPoint(false)
}

const getApplicationEndPoint = async function (req) {
  const name = req.params.name

  const application = await ApplicationService.getApplicationEndPoint({ name }, false)
  return application
}

const getSystemApplicationEndPoint = async function (req) {
  const name = req.params.name
  const application = await ApplicationService.getSystemApplicationEndPoint({ name }, false)
  return application
}

const patchApplicationEndPoint = async function (req) {
  const application = req.body
  const name = req.params.name

  return ApplicationService.patchApplicationEndPoint(application, { name }, false)
}

const updateApplicationEndPoint = async function (req) {
  const application = req.body
  const name = req.params.name

  return ApplicationService.updateApplicationEndPoint(application, name, false)
}

const updateApplicationYAMLEndPoint = async function (req) {
  if (!req.file) {
    throw new errors.ValidationError(ErrorMessages.APPLICATION_FILE_NOT_FOUND)
  }
  const name = req.params.name
  const fileContent = req.file.buffer.toString()
  const application = await YAMLParserService.parseAppFile(fileContent)
  await rvaluesVarSubstition(application, { self: application })

  return ApplicationService.updateApplicationEndPoint(application, name, false)
}

const deleteApplicationEndPoint = async function (req) {
  const name = req.params.name

  return ApplicationService.deleteApplicationEndPoint({ name }, false)
}

const deleteSystemApplicationEndPoint = async function (req) {
  const name = req.params.name

  return ApplicationService.deleteSystemApplicationEndPoint({ name }, false)
}

// Legacy

const deleteApplicationByIdEndPoint = async function (req) {
  const id = req.params.id

  return ApplicationService.deleteApplicationEndPoint({ id }, false)
}

const patchApplicationByIdEndPoint = async function (req) {
  const application = req.body
  const id = req.params.id

  return ApplicationService.patchApplicationEndPoint(application, { id }, false)
}

const getApplicationByIdEndPoint = async function (req) {
  const id = req.params.id

  const application = await ApplicationService.getApplicationEndPoint({ id }, false)
  return application
}

module.exports = {
  createApplicationEndPoint: (createApplicationEndPoint),
  createApplicationYAMLEndPoint: (createApplicationYAMLEndPoint),
  getApplicationsByUserEndPoint: (getApplicationsByUserEndPoint),
  getApplicationsBySystemEndPoint: (getApplicationsBySystemEndPoint),
  getApplicationEndPoint: (getApplicationEndPoint),
  getSystemApplicationEndPoint: (getSystemApplicationEndPoint),
  getApplicationByIdEndPoint: (getApplicationByIdEndPoint),
  updateApplicationEndPoint: (updateApplicationEndPoint),
  updateApplicationYAMLEndPoint: (updateApplicationYAMLEndPoint),
  patchApplicationEndPoint: (patchApplicationEndPoint),
  patchApplicationByIdEndPoint: (patchApplicationByIdEndPoint),
  deleteApplicationEndPoint: (deleteApplicationEndPoint),
  deleteSystemApplicationEndPoint: (deleteSystemApplicationEndPoint),
  deleteApplicationByIdEndPoint: (deleteApplicationByIdEndPoint)
}
