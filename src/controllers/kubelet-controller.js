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

const KubeletService = require('../services/kubelet-service')
const AuthDecorator = require('../decorators/authorization-decorator')

const kubeletCreatePodEndPoint = async function (req, user) {
  const createPodData = req.body
  const fogNodeUuid = req.query.nodeName

  return KubeletService.kubeletCreatePod(createPodData, fogNodeUuid, user)
}

const kubeletUpdatePodEndPoint = async function (req, user) {
  const uploadPodData = req.body
  const fogNodeUuid = req.query.nodeName

  return KubeletService.kubeletUpdatePod(uploadPodData, fogNodeUuid, user)
}

const kubeletDeletePodEndPoint = async function (req, user) {
  const fogNodeUuid = req.query.nodeName
  const podData = req.body

  return KubeletService.kubeletDeletePod(podData, fogNodeUuid, user)
}

const kubeletGetPodEndPoint = async function (req, user) {
  const namespace = req.query.namespace
  const name = req.query.name
  const fogNodeUuid = req.query.nodeName

  return KubeletService.kubeletGetPod(namespace, name, fogNodeUuid, user)
}

const kubeletGetContainerLogsEndPoint = async function (req, user) {
  const namespace = req.query.namespace
  const podName = req.query.podName
  const containerName = req.query.containerName
  const tail = req.query.tail
  const fogNodeUuid = req.query.nodeName

  return KubeletService.kubeletGetContainerLogs(namespace, podName, containerName, tail, fogNodeUuid)
}

const kubeletGetPodStatusEndPoint = async function (req, user) {
  const namespace = req.query.namespace
  const name = req.query.name
  const fogNodeUuid = req.query.nodeName

  return KubeletService.kubeletGetPodStatus(namespace, name, fogNodeUuid, user)
}

const kubeletGetPodsEndPoint = async function (req, user) {
  const fogNodeUuid = req.query.nodeName

  return KubeletService.kubeletGetPods(fogNodeUuid, user)
}

const kubeletGetCapacityEndPoint = async function (req, user) {
  const fogNodeUuid = req.query.nodeName

  return KubeletService.kubeletGetCapacity(fogNodeUuid, user)
}

const kubeletGetAllocatableEndPoint = async function (req, user) {
  const fogNodeUuid = req.query.nodeName

  return KubeletService.kubeletGetAllocatable(fogNodeUuid, user)
}

const kubeletGetNodeConditionsEndPoint = async function (req, user) {
  const fogNodeUuid = req.query.nodeName

  return KubeletService.kubeletGetNodeConditions(fogNodeUuid, user)
}

const kubeletGetNodeAddressesEndPoint = async function (req, user) {
  const fogNodeUuid = req.query.nodeName

  return KubeletService.kubeletGetNodeAddresses(fogNodeUuid, user)
}

const kubeletGetVkTokenEndPoint = async function (req, user) {
  const userId = user.id

  return KubeletService.kubeletGetVkToken(userId)
}

const kubeletGetSchedulerTokenEndPoint = async function (req, user) {
  const userId = user.id

  return KubeletService.kubeletGetSchedulerToken(userId)
}

module.exports = {
  kubeletCreatePodEndPoint: AuthDecorator.checkAuthToken(kubeletCreatePodEndPoint),
  kubeletUpdatePodEndPoint: AuthDecorator.checkAuthToken(kubeletUpdatePodEndPoint),
  kubeletDeletePodEndPoint: AuthDecorator.checkAuthToken(kubeletDeletePodEndPoint),
  kubeletGetPodEndPoint: AuthDecorator.checkAuthToken(kubeletGetPodEndPoint),
  kubeletGetContainerLogsEndPoint: AuthDecorator.checkAuthToken(kubeletGetContainerLogsEndPoint),
  kubeletGetPodStatusEndPoint: AuthDecorator.checkAuthToken(kubeletGetPodStatusEndPoint),
  kubeletGetPodsEndPoint: AuthDecorator.checkAuthToken(kubeletGetPodsEndPoint),
  kubeletGetCapacityEndPoint: AuthDecorator.checkAuthToken(kubeletGetCapacityEndPoint),
  kubeletGetAllocatableEndPoint: AuthDecorator.checkAuthToken(kubeletGetAllocatableEndPoint),
  kubeletGetNodeConditionsEndPoint: AuthDecorator.checkAuthToken(kubeletGetNodeConditionsEndPoint),
  kubeletGetNodeAddressesEndPoint: AuthDecorator.checkAuthToken(kubeletGetNodeAddressesEndPoint),
  kubeletGetVkTokenEndPoint: AuthDecorator.checkAuthToken(kubeletGetVkTokenEndPoint),
  kubeletGetSchedulerTokenEndPoint: AuthDecorator.checkAuthToken(kubeletGetSchedulerTokenEndPoint)
}
