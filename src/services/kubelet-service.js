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

const moment = require('moment')

const FlowService = require('./flow-service')
const IOFogService = require('./iofog-service')
const KubeletAccessTokenService = require('./kubelet-access-token-service')
const MicroservicesService = require('./microservices-service')
const SchedulerAccessTokenService = require('./scheduler-access-token-service')
const TransactionDecorator = require('../decorators/transaction-decorator')

const kubeletCreatePod = async function(createPodData, fogNodeUuid, user, transaction) {
  const msMetadata = JSON.parse(createPodData.metadata.annotations.microservices)

  const flowData = {
    name: createPodData.metadata.name,
    isActivated: true,
    description: JSON.stringify(createPodData),
  }
  const flow = await FlowService.getFlowByName(flowData.name, user, transaction)

  const existingMicroservices = await MicroservicesService.listMicroservices(flow.id, user, false, transaction)

  const microservices = microservicesTopologicalOrder(msMetadata)
  const microservicesIds = []
  for (const ms of microservices) {
    const name = `${flowData.name}-${ms.name}`
    const existingMicroservice = existingMicroservices.microservices.find((it) => it.name === name)
    if (existingMicroservice) {
      microservicesIds.push(existingMicroservice.uuid)
      continue
    }

    ms.routes = ms.routes || []
    ms.routes = ms.routes.map((route) => {
      if (!route.startsWith('@')) {
        return route
      }
      const routeId = route.substr(1) * 1
      const idx = microservices.findIndex((it) => it.originalIndex == routeId)
      return microservicesIds[idx]
    })

    const microserviceData = {
      name: name,
      config: ms.config,
      catalogItemId: ms['catalog-item-id'],
      flowId: flow.id,
      iofogUuid: fogNodeUuid,
      rootHostAccess: ms['host-access'],
      volumeMappings: ms['volume-mappings'] || [],
      ports: ms.ports || [],
      routes: ms.routes || [],
    }
    microservice = await MicroservicesService.createMicroservice(microserviceData, user, false, transaction)
    microservicesIds.push(microservice.uuid)
  }
}

const kubeletUpdatePod = async function(uploadPodData, fogNodeUuid, user, transaction) {
  // TODO: to implement
  // debugger
}

const kubeletDeletePod = async function(podData, fogNodeUuid, user, transaction) {
  const flowName = podData.metadata.name

  const flow = await FlowService.getFlowByName(flowName, user, transaction)

  const existingMicroservices = await MicroservicesService.listMicroservices(flow.id, user, false, transaction)
  existingMicroservices.microservices.forEach(async (ms) => {
    await MicroservicesService.deleteMicroservice(ms.uuid, {withCleanup: true}, user, false, transaction)
  })

  await FlowService.deleteFlow(flow.id, user, false, transaction)
}

const kubeletGetPod = async function(namespace, name, fogNodeUuid, user, transaction) {
  const flow = await FlowService.getFlowByName(name, user, transaction)

  return JSON.parse(flow.description)
}

const kubeletGetContainerLogs = async function(namespace, podName, containerName, tail, fogNodeUuid, user, transaction) {
  // TODO: to implement
  // debugger
}

const kubeletGetPodStatus = async function(namespace, name, fogNodeUuid, user, transaction) {
  await FlowService.getFlowByName(name, user, transaction)

  const pod = await kubeletGetPod(namespace, name, fogNodeUuid, user, transaction)
  const status = {
    phase: 'Running',
    hostIP: '1.2.3.4',
    podIP: '5.6.7.8',
    startTime: moment.utc(),
    conditions: [
      {
        Type: 'PodInitialized',
        Status: 'True',
      },
      {
        Type: 'PodReady',
        Status: 'True',
      },
      {
        Type: 'PodScheduled',
        Status: 'True',
      },
    ],
    containerStatuses: [],
  }
  status.containerStatuses = pod.spec.containers.map((c) => ({
    name: c.name,
    image: c.image,
    ready: true,
    restartCount: 0,
    state: {
      running: {
        startedAt: moment.utc(),
      },
    },
  }))

  return status
}

const kubeletGetPods = async function(fogNodeUuid, user, transaction) {
  // TODO: to implement
  // debugger
  return []
}

const kubeletGetCapacity = async function(fogNodeUuid, user, transaction) {
  const node = await IOFogService.getFog({uuid: fogNodeUuid}, user, false, transaction)
  return {
    cpu: node.cpuLimit - node.cpuUsage,
    memory: `${(node.memoryLimit - node.memoryUsage).toFixed(0)}Mi`,
    pods: '1',
  }
}

const kubeletGetNodeConditions = async function(fogNodeUuid, user, transaction) {
  const node = await IOFogService.getFog({uuid: fogNodeUuid}, user, false, transaction)
  const now = moment().utc().toISOString()
  const lastStatusTime = node.lastStatusTime ? moment(node.lastStatusTime).utc().toISOString() : null
  return [
    {
      type: 'Ready',
      status: 'True', // node.daemonStatus === 'RUNNING' ? 'True' : 'False',
      lastHeartbeatTime: lastStatusTime,
      lastTransitionTime: now,
      reason: '',
      message: node.daemonStatus,
    },
    {
      type: 'OutOfDisk',
      status: node.diskUsage >= node.diskLimit ? 'True' : 'False',
      lastHeartbeatTime: lastStatusTime,
      lastTransitionTime: now,
      reason: '',
      message: `Usage: ${node.diskUsage}, Limit: ${node.diskLimit}`,
    },
    {
      type: 'MemoryPressure',
      status: (node.memoryUsage / node.memoryLimit) >= 0.9 ? 'True' : 'False',
      lastHeartbeatTime: lastStatusTime,
      lastTransitionTime: now,
      reason: '',
      message: `Usage: ${node.memoryUsage}, Limit: ${node.memoryLimit}`,
    },
    {
      type: 'DiskPressure',
      status: (node.diskUsage / node.diskLimit) >= 0.9 ? 'True' : 'False',
      lastHeartbeatTime: lastStatusTime,
      lastTransitionTime: now,
      reason: '',
      message: `Usage: ${node.diskUsage}, Limit: ${node.diskLimit}`,
    },
    {
      type: 'NetworkUnavailable',
      status: 'False',
      lastHeartbeatTime: lastStatusTime,
      lastTransitionTime: now,
      reason: '',
      message: '',
    },
  ]
}

const kubeletGetNodeAddresses = async function(fogNodeUuid, user, transaction) {
  const node = await IOFogService.getFog({uuid: fogNodeUuid}, user, false, transaction)
  if (!node.ipAddress || node.ipAddress === '0.0.0.0') {
    return []
  }

  return [
    {
      type: 'InternalIP',
      address: node.ipAddress,
    },
  ]
}

const kubeletGetVkToken = async function(userId, transaction) {
  const newAccessToken = await KubeletAccessTokenService.generateAccessToken(transaction)
  await KubeletAccessTokenService.updateAccessToken(userId, newAccessToken, transaction)

  return {
    userId: userId,
    token: newAccessToken.token,
  }
}

const kubeletGetSchedulerToken = async function(transaction) {
  const newAccessToken = await SchedulerAccessTokenService.generateAccessToken(transaction)
  await SchedulerAccessTokenService.updateAccessToken(userId, newAccessToken, transaction)

  return {
    userId: userId,
    token: newAccessToken.token,
  }
}

const microservicesTopologicalOrder = function(msMetadata) {
  const microservices = []
  const graph = []
  msMetadata.forEach((ms, i) => {
    graph[i] = {
      edges: [],
    }

    if (!ms.routes) {
      return
    }

    ms.routes.forEach((route) => {
      if (route.startsWith('@')) {
        graph[i].edges.push(route.substr(1))
      }
    })
  })

  const stack = msMetadata.reduce((prev, ms, i) => {
    if (graph[i].edges.length === 0) {
      return prev.concat(i)
    }

    return prev
  }, [])

  while (stack.length > 0) {
    const n = stack.pop()
    microservices.push(n)
    graph.forEach((node, i) => {
      if (!node.edges.length) {
        return
      }

      node.edges = node.edges.filter((e) => e != n)
      if (!node.edges.length) {
        stack.push(i)
      }
    })
  }

  const hasCircuit = !!graph.filter((node) => !!node.edges.length).length
  if (hasCircuit) {
    throw new Error('Circular dependency!!!')
  }

  return microservices.map((idx) => Object.assign({originalIndex: idx}, msMetadata[idx]))
}

module.exports = {
  kubeletCreatePod: TransactionDecorator.generateFakeTransaction(kubeletCreatePod),
  kubeletUpdatePod: TransactionDecorator.generateFakeTransaction(kubeletUpdatePod),
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
