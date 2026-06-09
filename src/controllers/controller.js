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

const ControllerService = require('../services/controller-service')

const statusControllerEndPoint = async function (req) {
  return ControllerService.statusController(false)
}

const fogTypesEndPoint = async function (req) {
  return ControllerService.getFogTypes(false)
}

module.exports = {
  statusControllerEndPoint: statusControllerEndPoint,
  fogTypesEndPoint: fogTypesEndPoint
}
