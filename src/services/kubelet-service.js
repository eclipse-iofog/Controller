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

const KubeletAccessTokenService = require('./kubelet-access-token-service')
const TransactionDecorator = require('../decorators/transaction-decorator')

const kubeletCreatePod = async function (createPodData, fogNodeUuid, transaction) {
  //TODO: to implement
}
const kubeletUploadPod = async function (uploadPodData, fogNodeUuid, transaction) {
  //TODO: to implement
}
const kubeletDeletePod = async function (fogNodeUuid, transaction) {
  //TODO: to implement
}
const kubeletGetPod = async function (namespace, name, fogNodeUuid, transaction) {
  //TODO: to implement
}
const kubeletGetContainerLogs = async function (namespace, podName, containerName, tail, fogNodeUuid, transaction) {
  //TODO: to implement
}
const kubeletGetPodStatus = async function (namespace, name, fogNodeUuid, transaction) {
  //TODO: to implement
}
const kubeletGetPods = async function (fogNodeUuid, transaction) {
  //TODO: to implement
}
const kubeletGetCapacity = async function (fogNodeUuid, transaction) {
  //TODO: to implement
}
const kubeletGetNodeConditions = async function (fogNodeUuid, transaction) {
  //TODO: to implement
}
const kubeletGetNodeAddresses = async function (fogNodeUuid, transaction) {
  //TODO: to implement
}
const kubeletGetVkToken = async function (fogNodeUuid, transaction) {
  const newAccessToken = await KubeletAccessTokenService.generateAccessToken(transaction)
  await KubeletAccessTokenService.updateAccessToken(fogNodeUuid, newAccessToken, transaction)

  return {
    uuid: fogNodeUuid,
    token: newAccessToken.token
  }
}
const kubeletGetSchedulerToken = async function (transaction) {
  //TODO: to implement
}

module.exports = {
  kubeletCreatePod: TransactionDecorator.generateFakeTransaction(kubeletCreatePod),
  kubeletUploadPod: TransactionDecorator.generateFakeTransaction(kubeletUploadPod),
  kubeletDeletePod: TransactionDecorator.generateFakeTransaction(kubeletDeletePod),
  kubeletGetPod: TransactionDecorator.generateFakeTransaction(kubeletGetPod),
  kubeletGetContainerLogs: TransactionDecorator.generateFakeTransaction(kubeletGetContainerLogs),
  kubeletGetPodStatus: TransactionDecorator.generateFakeTransaction(kubeletGetPodStatus),
  kubeletGetPods: TransactionDecorator.generateFakeTransaction(kubeletGetPods),
  kubeletGetCapacity: TransactionDecorator.generateFakeTransaction(kubeletGetCapacity),
  kubeletGetNodeConditions: TransactionDecorator.generateFakeTransaction(kubeletGetNodeConditions),
  kubeletGetNodeAddresses: TransactionDecorator.generateFakeTransaction(kubeletGetNodeAddresses),
  kubeletGetVkToken: TransactionDecorator.generateFakeTransaction(kubeletGetVkToken),
  kubeletGetSchedulerToken: TransactionDecorator.generateFakeTransaction(kubeletGetSchedulerToken),
}