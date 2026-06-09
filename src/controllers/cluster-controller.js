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

const ClusterControllerService = require('../services/cluster-controller-service')

const listClusterControllersEndPoint = async function (req) {
  return ClusterControllerService.listClusterControllers(false)
}

const getClusterControllerEndPoint = async function (req) {
  const uuid = req.params.uuid
  return ClusterControllerService.getClusterController(uuid, false)
}

const updateClusterControllerEndPoint = async function (req) {
  const uuid = req.params.uuid
  const data = req.body
  return ClusterControllerService.updateClusterController(uuid, data, false)
}

const deleteClusterControllerEndPoint = async function (req) {
  const uuid = req.params.uuid
  return ClusterControllerService.deleteClusterController(uuid, false)
}

module.exports = {
  listClusterControllersEndPoint,
  getClusterControllerEndPoint,
  updateClusterControllerEndPoint,
  deleteClusterControllerEndPoint
}
