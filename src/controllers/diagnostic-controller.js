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

const DiagnosticService = require('../services/diagnostic-service')
const AuthDecorator = require('./../decorators/authorization-decorator')

const changeMicroserviceStraceStateEndPoint = async function (req, user) {
  return DiagnosticService.changeMicroserviceStraceState(req.params.uuid, req.body, user, false)
}

const getMicroserviceStraceDataEndPoint = async function (req, user) {
  return DiagnosticService.getMicroserviceStraceData(req.params.uuid, req.query, user, false)
}

const postMicroserviceStraceDataToFtpEndPoint = async function (req, user) {
  return DiagnosticService.postMicroserviceStraceDatatoFtp(req.params.uuid, req.body, user, false)
}

const createMicroserviceImageSnapshotEndPoint = async function (req, user) {
  return DiagnosticService.postMicroserviceImageSnapshotCreate(req.params.uuid, user, false)
}

const getMicroserviceImageSnapshotEndPoint = async function (req, user) {
  return DiagnosticService.getMicroserviceImageSnapshot(req.params.uuid, user, false)
}

module.exports = {
  changeMicroserviceStraceStateEndPoint: AuthDecorator.checkAuthToken(changeMicroserviceStraceStateEndPoint),
  getMicroserviceStraceDataEndPoint: AuthDecorator.checkAuthToken(getMicroserviceStraceDataEndPoint),
  postMicroserviceStraceDataToFtpEndPoint: AuthDecorator.checkAuthToken(postMicroserviceStraceDataToFtpEndPoint),
  createMicroserviceImageSnapshotEndPoint: AuthDecorator.checkAuthToken(createMicroserviceImageSnapshotEndPoint),
  getMicroserviceImageSnapshotEndPoint: AuthDecorator.checkAuthToken(getMicroserviceImageSnapshotEndPoint)
}
