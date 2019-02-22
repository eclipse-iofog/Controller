/*
 * *******************************************************************************
 *  * Copyright (c) 2019 Edgeworx, Inc.
 *  *
 *  * This program and the accompanying materials are made available under the
 *  * terms of the Eclipse Public License v. 2.0 which is available at
 *  * http://www.eclipse.org/legal/epl-2.0
 *  *
 *  * SPDX-License-Identifier: EPL-2.0
 *  *******************************************************************************
 *
 */

const KubeletService = require('../services/kubelet-service')

const kubeletCreatePodEndPoint = async function (req) {
  const createPodData = req.body
  const fogNodeUuid = req.params.nodeName

  return await KubeletService.kubeletCreatePod(createPodData, fogNodeUuid)
}

const kubeletUploadPodEndPoint = async function (req) {
  const uploadPodData = req.body
  const fogNodeUuid = req.params.nodeName

  return await KubeletService.kubeletUploadPod(uploadPodData, fogNodeUuid)
}

const kubeletDeletePodEndPoint = async function (req) {
  const fogNodeUuid = req.params.nodeName

  return await KubeletService.kubeletDeletePod(fogNodeUuid);
}

const kubeletGetPodEndPoint = async function (req) {
  const namespace = req.params.namespace
  const name = req.params.name
  const fogNodeUuid = req.params.nodeName

  return await KubeletService.kubeletGetPod(namespace, name, fogNodeUuid)
}

const kubeletGetContainerLogsEndPoint = async function (req) {
  const namespace = req.params.namespace
  const podName = req.params.podName
  const containerName = req.params.containerName
  const tail = req.params.tail
  const fogNodeUuid = req.params.nodeName

  return await KubeletService.kubeletGetContainerLogs(namespace, podName, containerName, tail, fogNodeUuid)
}

const kubeletGetPodStatusEndPoint = async function (req) {
  const namespace = req.params.namespace
  const name = req.params.name
  const fogNodeUuid = req.params.nodeName

  return await KubeletService.kubeletGetPodStatus(namespace, name, fogNodeUuid)
}

const kubeletGetPodsEndPoint = async function (req) {
  const fogNodeUuid = req.params.nodeName

  return await KubeletService.kubeletGetPods(createPodData, fogNodeUuid)
}

const kubeletGetCapacityEndPoint = async function (req) {
  const fogNodeUuid = req.params.nodeName

  return await KubeletService.kubeletGetCapacity(createPodData, fogNodeUuid)
}

const kubeletGetNodeConditionsEndPoint = async function (req) {
  const fogNodeUuid = req.params.nodeName

  return await KubeletService.kubeletGetNodeConditions(createPodData, fogNodeUuid)
}

const kubeletGetNodeAddressesEndPoint = async function (req) {
  const fogNodeUuid = req.params.nodeName

  return await KubeletService.kubeletGetNodeAddresses(createPodData, fogNodeUuid)
}

const kubeletGetVkTokenEndPoint = async function (req) {
  const fogNodeUuid = req.params.nodeName
  return await KubeletService.kubeletGetVkToken(fogNodeUuid)
}

const kubeletGetSchedulerTokenEndPoint = async function () {
  return await KubeletService.kubeletGetSchedulerToken()
}

module.exports = {
  kubeletCreatePodEndPoint: kubeletCreatePodEndPoint,
  kubeletUploadPodEndPoint: kubeletUploadPodEndPoint,
  kubeletDeletePodEndPoint: kubeletDeletePodEndPoint,
  kubeletGetPodEndPoint: kubeletGetPodEndPoint,
  kubeletGetContainerLogsEndPoint: kubeletGetContainerLogsEndPoint,
  kubeletGetPodStatusEndPoint: kubeletGetPodStatusEndPoint,
  kubeletGetPodsEndPoint: kubeletGetPodsEndPoint,
  kubeletGetCapacityEndPoint: kubeletGetCapacityEndPoint,
  kubeletGetNodeConditionsEndPoint: kubeletGetNodeConditionsEndPoint,
  kubeletGetNodeAddressesEndPoint: kubeletGetNodeAddressesEndPoint,
  kubeletGetVkTokenEndPoint: kubeletGetVkTokenEndPoint,
  kubeletGetSchedulerTokenEndPoint: kubeletGetSchedulerTokenEndPoint,
}