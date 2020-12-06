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

const createApplicationTemplateEndPoint = async function (req, user) {
  const application = req.body

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

const deleteApplicationTemplateEndPoint = async function (req, user) {
  const name = req.params.name

  return ApplicationTemplateService.deleteApplicationTemplateEndPoint({ name }, user, false)
}

const deployApplicationTemplateEndPoint = async function (req, user) {
  const application = req.body
  const templateName = req.params.name

  return ApplicationTemplateService.deployApplicationTemplateEndPoint(application, templateName, user, false)
}

module.exports = {
  createApplicationTemplateEndPoint: AuthDecorator.checkAuthToken(createApplicationTemplateEndPoint),
  getApplicationTemplatesByUserEndPoint: AuthDecorator.checkAuthToken(getApplicationTemplatesByUserEndPoint),
  getApplicationTemplateEndPoint: AuthDecorator.checkAuthToken(getApplicationTemplateEndPoint),
  updateApplicationTemplateEndPoint: AuthDecorator.checkAuthToken(updateApplicationTemplateEndPoint),
  patchApplicationTemplateEndPoint: AuthDecorator.checkAuthToken(patchApplicationTemplateEndPoint),
  deleteApplicationTemplateEndPoint: AuthDecorator.checkAuthToken(deleteApplicationTemplateEndPoint),
  deployApplicationTemplateEndPoint: AuthDecorator.checkAuthToken(deployApplicationTemplateEndPoint)
}
