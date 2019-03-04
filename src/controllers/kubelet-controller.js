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
const AuthDecorator = require('../decorators/authorization-decorator')

const kubeletCreatePodEndPoint = async function(req, user) {
  const createPodData = req.body
  const fogNodeUuid = req.query.nodeName
  console.log('Create', JSON.stringify(createPodData), fogNodeUuid)

  return await KubeletService.kubeletCreatePod(createPodData, fogNodeUuid, user)
}

const kubeletUpdatePodEndPoint = async function(req, user) {
  const uploadPodData = req.body
  const fogNodeUuid = req.query.nodeName
  console.log('Update', uploadPodData, fogNodeUuid)

  return await KubeletService.kubeletUpdatePod(uploadPodData, fogNodeUuid, user)
}

const kubeletDeletePodEndPoint = async function(req, user) {
  const fogNodeUuid = req.query.nodeName
  const podData = req.body
  console.log('Delete', fogNodeUuid, podData)

  return await KubeletService.kubeletDeletePod(podData, fogNodeUuid, user)
}

const kubeletGetPodEndPoint = async function(req, user) {
  const namespace = req.query.namespace
  const name = req.query.name
  const fogNodeUuid = req.query.nodeName
  console.log('GetPod', namespace, name, fogNodeUuid)

  return await KubeletService.kubeletGetPod(namespace, name, fogNodeUuid, user)
}

const kubeletGetContainerLogsEndPoint = async function(req, user) {
  const namespace = req.query.namespace
  const podName = req.query.podName
  const containerName = req.query.containerName
  const tail = req.query.tail
  const fogNodeUuid = req.query.nodeName
  console.log('GetContainerLogs', namespace, podName, containerName, tail, fogNodeUuid)

  return await KubeletService.kubeletGetContainerLogs(namespace, podName, containerName, tail, fogNodeUuid)
}

const kubeletGetPodStatusEndPoint = async function(req, user) {
  const namespace = req.query.namespace
  const name = req.query.name
  const fogNodeUuid = req.query.nodeName
  console.log('GetPodStatus', namespace, name, fogNodeUuid)

  return await KubeletService.kubeletGetPodStatus(namespace, name, fogNodeUuid)
}

const kubeletGetPodsEndPoint = async function(req, user) {
  const fogNodeUuid = req.query.nodeName
  console.log('GetPods', fogNodeUuid)

  return await KubeletService.kubeletGetPods(createPodData, fogNodeUuid)
}

const kubeletGetCapacityEndPoint = async function(req, user) {
  const fogNodeUuid = req.query.nodeName
  console.log('GetCapacity', fogNodeUuid)

  return await KubeletService.kubeletGetCapacity(fogNodeUuid, user)
}

const kubeletGetNodeConditionsEndPoint = async function(req, user) {
  const fogNodeUuid = req.query.nodeName
  console.log('GetNodeCondition', fogNodeUuid)

  return await KubeletService.kubeletGetNodeConditions(fogNodeUuid, user)
}

const kubeletGetNodeAddressesEndPoint = async function(req, user) {
  const fogNodeUuid = req.query.nodeName
  console.log('GetNodeAddresses', fogNodeUuid)

  return await KubeletService.kubeletGetNodeAddresses(fogNodeUuid, user)
}

const kubeletGetVkTokenEndPoint = async function(req, user) {
  const userId = user.id

  return await KubeletService.kubeletGetVkToken(userId)
}

const kubeletGetSchedulerTokenEndPoint = async function(req, user) {
  const userId = user.id

  return await KubeletService.kubeletGetSchedulerToken(userId)
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
  kubeletGetNodeConditionsEndPoint: AuthDecorator.checkAuthToken(kubeletGetNodeConditionsEndPoint),
  kubeletGetNodeAddressesEndPoint: AuthDecorator.checkAuthToken(kubeletGetNodeAddressesEndPoint),
  kubeletGetVkTokenEndPoint: AuthDecorator.checkAuthToken(kubeletGetVkTokenEndPoint),
  kubeletGetSchedulerTokenEndPoint: AuthDecorator.checkAuthToken(kubeletGetSchedulerTokenEndPoint),
}
