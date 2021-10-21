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
const ApplicationService = require('../services/application-service')
const YAMLParserService = require('../services/yaml-parser-service')
const errors = require('../helpers/errors')
const ErrorMessages = require('../helpers/error-messages')
const { rvaluesVarSubstition } = require('../helpers/template-helper')

const createApplicationEndPoint = async function (req, user) {
  const application = req.body

  return ApplicationService.createApplicationEndPoint(application, user, false)
}

const createApplicationYAMLEndPoint = async function (req, user) {
  if (!req.file) {
    throw new errors.ValidationError(ErrorMessages.APPLICATION_FILE_NOT_FOUND)
  }
  const fileContent = req.file.buffer.toString()
  const application = await YAMLParserService.parseAppFile(fileContent)
  await rvaluesVarSubstition(application, { self: application }, user)

  return ApplicationService.createApplicationEndPoint(application, user, false)
}

const getApplicationsByUserEndPoint = async function (req, user) {
  return ApplicationService.getUserApplicationsEndPoint(user, false)
}

const getApplicationEndPoint = async function (req, user) {
  const name = req.params.name

  const application = await ApplicationService.getApplicationEndPoint({ name }, user, false)
  return application
}

const patchApplicationEndPoint = async function (req, user) {
  const application = req.body
  const name = req.params.name

  return ApplicationService.patchApplicationEndPoint(application, { name }, user, false)
}

const updateApplicationEndPoint = async function (req, user) {
  const application = req.body
  const name = req.params.name

  return ApplicationService.updateApplicationEndPoint(application, name, user, false)
}

const updateApplicationYAMLEndPoint = async function (req, user) {
  if (!req.file) {
    throw new errors.ValidationError(ErrorMessages.APPLICATION_FILE_NOT_FOUND)
  }
  const name = req.params.name
  const fileContent = req.file.buffer.toString()
  const application = await YAMLParserService.parseAppFile(fileContent)
  await rvaluesVarSubstition(application, { self: application }, user)

  return ApplicationService.updateApplicationEndPoint(application, name, user, false)
}

const deleteApplicationEndPoint = async function (req, user) {
  const name = req.params.name

  return ApplicationService.deleteApplicationEndPoint({ name }, user, false)
}

// Legacy

const deleteApplicationByIdEndPoint = async function (req, user) {
  const id = req.params.id

  return ApplicationService.deleteApplicationEndPoint({ id }, user, false)
}

const patchApplicationByIdEndPoint = async function (req, user) {
  const application = req.body
  const id = req.params.id

  return ApplicationService.patchApplicationEndPoint(application, { id }, user, false)
}

const getApplicationByIdEndPoint = async function (req, user) {
  const id = req.params.id

  const application = await ApplicationService.getApplicationEndPoint({ id }, user, false)
  return application
}

module.exports = {
  createApplicationEndPoint: AuthDecorator.checkAuthToken(createApplicationEndPoint),
  createApplicationYAMLEndPoint: AuthDecorator.checkAuthToken(createApplicationYAMLEndPoint),
  getApplicationsByUserEndPoint: AuthDecorator.checkAuthToken(getApplicationsByUserEndPoint),
  getApplicationEndPoint: AuthDecorator.checkAuthToken(getApplicationEndPoint),
  getApplicationByIdEndPoint: AuthDecorator.checkAuthToken(getApplicationByIdEndPoint),
  updateApplicationEndPoint: AuthDecorator.checkAuthToken(updateApplicationEndPoint),
  updateApplicationYAMLEndPoint: AuthDecorator.checkAuthToken(updateApplicationYAMLEndPoint),
  patchApplicationEndPoint: AuthDecorator.checkAuthToken(patchApplicationEndPoint),
  patchApplicationByIdEndPoint: AuthDecorator.checkAuthToken(patchApplicationByIdEndPoint),
  deleteApplicationEndPoint: AuthDecorator.checkAuthToken(deleteApplicationEndPoint),
  deleteApplicationByIdEndPoint: AuthDecorator.checkAuthToken(deleteApplicationByIdEndPoint)
}
