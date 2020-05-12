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

const createApplicationEndPoint = async function (req, user) {
  const application = req.body

  return ApplicationService.createApplicationEndPoint(application, user, false)
}

const getApplicationsByUserEndPoint = async function (req, user) {
  return ApplicationService.getUserApplicationsEndPoint(user, false)
}

const getApplicationEndPoint = async function (req, user) {
  const name = req.params.name

  return ApplicationService.getApplicationEndPoint(name, user, false)
}

const patchApplicationEndPoint = async function (req, user) {
  const application = req.body
  const applicationName = req.params.name

  return ApplicationService.patchApplicationEndPoint(application, applicationName, user, false)
}

const updateApplicationEndPoint = async function (req, user) {
  const application = req.body
  const name = req.params.name

  return ApplicationService.updateApplicationEndPoint(application, name, user, false)
}

const deleteApplicationEndPoint = async function (req, user) {
  const name = req.params.name

  return ApplicationService.deleteApplicationEndPoint(name, user, false)
}

module.exports = {
  createApplicationEndPoint: AuthDecorator.checkAuthToken(createApplicationEndPoint),
  getApplicationsByUserEndPoint: AuthDecorator.checkAuthToken(getApplicationsByUserEndPoint),
  getApplicationEndPoint: AuthDecorator.checkAuthToken(getApplicationEndPoint),
  updateApplicationEndPoint: AuthDecorator.checkAuthToken(updateApplicationEndPoint),
  patchApplicationEndPoint: AuthDecorator.checkAuthToken(patchApplicationEndPoint),
  deleteApplicationEndPoint: AuthDecorator.checkAuthToken(deleteApplicationEndPoint)
}
