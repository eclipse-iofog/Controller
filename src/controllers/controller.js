/*
 * *******************************************************************************
 *  * Copyright (c) 2018 Edgeworx, Inc.
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


const statusControllerEndPoint = async function(req) {
  return await ControllerService.statusController(false)
}

const emailActivationEndPoint = async function(req) {
  return await ControllerService.emailActivation(false)
}

const fogTypesEndPoint = async function(req) {
  return await ControllerService.getFogTypes(false)
}


module.exports = {
  statusControllerEndPoint: statusControllerEndPoint,
  emailActivationEndPoint: emailActivationEndPoint,
  fogTypesEndPoint: fogTypesEndPoint,
}
