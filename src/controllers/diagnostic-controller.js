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

const DiagnosticService = require('../services/diagnostic-service')

const changeMicroserviceStraceStateEndPoint = async function (req) {
  return DiagnosticService.changeMicroserviceStraceState(req.params.uuid, req.body, false)
}

const getMicroserviceStraceDataEndPoint = async function (req) {
  return DiagnosticService.getMicroserviceStraceData(req.params.uuid, req.query, false)
}

const postMicroserviceStraceDataToFtpEndPoint = async function (req) {
  return DiagnosticService.postMicroserviceStraceDatatoFtp(req.params.uuid, req.body, false)
}

const createMicroserviceImageSnapshotEndPoint = async function (req) {
  return DiagnosticService.postMicroserviceImageSnapshotCreate(req.params.uuid, false)
}

const getMicroserviceImageSnapshotEndPoint = async function (req) {
  return DiagnosticService.getMicroserviceImageSnapshot(req.params.uuid, false)
}

module.exports = {
  changeMicroserviceStraceStateEndPoint: (changeMicroserviceStraceStateEndPoint),
  getMicroserviceStraceDataEndPoint: (getMicroserviceStraceDataEndPoint),
  postMicroserviceStraceDataToFtpEndPoint: (postMicroserviceStraceDataToFtpEndPoint),
  createMicroserviceImageSnapshotEndPoint: (createMicroserviceImageSnapshotEndPoint),
  getMicroserviceImageSnapshotEndPoint: (getMicroserviceImageSnapshotEndPoint)
}
