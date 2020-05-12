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

const moment = require('moment')

const AppHelper = require('../helpers/app-helper')
const ErrorMessages = require('../helpers/error-messages')
const Errors = require('../helpers/errors')
const FlowService = require('./application-service')
const FogManager = require('../data/managers/iofog-manager')
const IOFogService = require('./iofog-service')
const KubeletAccessTokenService = require('./kubelet-access-token-service')
const logger = require('../logger')
const MicroservicesService = require('./microservices-service')
const MicroserviceStatusManager = require('../data/managers/microservice-status-manager')
// const SchedulerAccessTokenService = require('./scheduler-access-token-service')
const TransactionDecorator = require('../decorators/transaction-decorator')

const NODE_CAPACITY = 100

const processPodPayload = function (createPodData, fogNodeUuid) {
  const msMetadata = JSON.parse(createPodData.metadata.annotations.microservices)
  const flowDescription = {
    metadata: createPodData,
    node: fogNodeUuid
  }

  const flowData = {
    name: createPodData.metadata.name,
    isActivated: true,
    description: Buffer.from(JSON.stringify(flowDescription)).toString('base64')
  }

  const microservices = microservicesTopologicalOrder(msMetadata)

  return {
    flowData,
    microservices
  }
}

const kubeletCreatePod = async function (createPodData, fogNodeUuid, user, transaction) {
  const podPayload = processPodPayload(createPodData, fogNodeUuid)
  const { flowData, microservices } = podPayload

  const flows = await FlowService.getAllFlowsEndPoint(false, transaction)
  let flow = flows.flows.find((flow) => flow.name === flowData.name)
  if (!flow) {
    flow = await FlowService.createFlowEndPoint(flowData, user, false, transaction)
  }

  const existingMicroservices = await MicroservicesService.listMicroservicesEndPoint(flow.id, user, false, transaction)

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
      const idx = microservices.findIndex((it) => it.originalIndex === routeId)
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
      routes: ms.routes || []
    }
    if (ms.env && ms.env.length > 0) {
      microserviceData.env = ms.env
    }
    if (ms.cmd && ms.cmd.length > 0) {
      microserviceData.cmd = ms.cmd
    }

    const microservice = await MicroservicesService.createMicroserviceEndPoint(microserviceData, user, false, transaction)
    microservicesIds.push(microservice.uuid)
  }
}

const kubeletUpdatePod = async function (uploadPodData, fogNodeUuid, user, transaction) {
  // Not supported yet.
  // const podPayload = processPodPayload(uploadPodData, fogNodeUuid)
  // const { flowData, microservices } = podPayload

  // const flows = await FlowService.getAllFlowsEndPoint(false, transaction)
  // const flow = flows.flows.find((flow) => flow.name === flowData.name)
  // if (!flow) {
  //   throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_FLOW_ID, flowData.name))
  // }

  // const existingMicroservices = await MicroservicesService.listMicroservicesEndPoint(flow.id, user, false, transaction)
  // const msDup = [].concat(microservices)
  // const toDelete = []
  // existingMicroservices.forEach((ms) => {
  //   const name = `${flowData.name}-${ms.name}`
  //   const idx = msDup.findIndex((it) => it.name === name)

  //   if (!idx) {
  //     toDelete.push(ms)
  //   } else {
  //     toUpdate.push(msDup[idx])
  //     msDup = msDup.splice(idx, 1)
  //   }
  // })

  // msDup.map((ms) => {
  //   const name = `${flowData.name}-${ms.name}`

  //   const microserviceData = {
  //     name: name,
  //     config: ms.config,
  //     catalogItemId: ms['catalog-item-id'],
  //     flowId: flow.id,
  //     iofogUuid: fogNodeUuid,
  //     rootHostAccess: ms['host-access'],
  //     volumeMappings: ms['volume-mappings'] || [],
  //     ports: ms.ports || [],
  //     routes: ms.routes || []
  //   }
  //   if (ms.env && ms.env.length > 0) {
  //     microserviceData.env = ms.env
  //   }
  //   if (ms.cmd && ms.cmd.length > 0) {
  //     microserviceData.cmd = ms.cmd
  //   }

  //   return microserviceData
  // })
}

const kubeletDeletePod = async function (podData, fogNodeUuid, user, transaction) {
  const flowName = podData.metadata.name

  const flows = await FlowService.getAllFlowsEndPoint(false, transaction)
  const flow = flows.flows.find((flow) => flow.name === flowName)
  if (!flow) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_IOFOG_UUID, fogNodeUuid))
  }

  const existingMicroservices = await MicroservicesService.listMicroservicesEndPoint(flow.id, user, false, transaction)
  existingMicroservices.microservices.forEach(async (ms) => {
    await MicroservicesService.deleteMicroserviceEndPoint(ms.uuid, { withCleanup: true }, user, false, transaction)
  })

  await FlowService.deleteFlowEndPoint(flow.id, user, false, transaction)
}

const kubeletGetPod = async function (namespace, name, fogNodeUuid, user, transaction) {
  const flow = await FlowService.getFlowByName(name, user, false, transaction)

  return JSON.parse(Buffer.from(flow.description, 'base64').toString('utf8')).metadata
}

const kubeletGetContainerLogs = async function (namespace, podName, containerName, tail, fogNodeUuid, user, transaction) {
  // Not supported yet
}

const kubeletGetPodStatus = async function (namespace, name, fogNodeUuid, user, transaction) {
  const fog = await FogManager.findOne({ uuid: fogNodeUuid }, transaction)
  const changeFrequency = (fog && fog.changeFrequency) || 60

  const flow = await FlowService.getFlowByName(name, user, false, transaction)
  const microservices = await MicroservicesService.listMicroservicesEndPoint(flow.id, user, false, transaction)
  const pod = JSON.parse(Buffer.from(flow.description, 'base64').toString('utf8')).metadata

  for (const ms of microservices.microservices) {
    const status = await MicroserviceStatusManager.findOne({ microserviceUuid: ms.uuid }, transaction)
    ms.status = status.dataValues
    ms.status.alive = moment().diff(moment(ms.status.updated_at), 'seconds') <= (changeFrequency * 2)
  }

  const phase = microservices.microservices.every((ms) => ms.status.status === 'RUNNING') ? 'Running' : 'Pending'
  const alive = microservices.microservices.every((ms) => ms.status.alive)
  const status = {
    phase: phase,
    startTime: (alive && phase === 'Running') ? moment(microservices.microservices[0].startTime).utc().toISOString() : null,
    conditions: [
      {
        Type: 'PodInitialized',
        Status: 'True'
      },
      {
        Type: 'PodReady',
        Status: (alive && phase === 'Running') ? 'True' : 'False'
      },
      {
        Type: 'PodScheduled',
        Status: 'True'
      }
    ],
    containerStatuses: []
  }

  status.containerStatuses = pod.spec.containers.map((c) => {
    const microservice = microservices.microservices.find((ms) => ms.name === `${name}-${c.name}`)

    const containerState = {}
    if (microservice.status.status === 'RUNNING') {
      containerState.running = { startedAt: moment(microservice.status.startTime).utc().toISOString() }
    } else {
      containerState.waiting = { reason: microservice.status.status }
    }

    return {
      name: c.name,
      imageID: microservice.uuid,
      ready: alive && microservice.status.status === 'RUNNING',
      restartCount: 0,
      state: containerState,
      containerId: microservice.status.containerId
    }
  })

  return status
}

const kubeletGetPods = async function (fogNodeUuid, user, transaction) {
  const flows = await FlowService.getAllFlowsEndPoint(false, transaction)
  const pods = flows.flows
    .reduce((prev, flow) => {
      try {
        const podsInfo = JSON.parse(Buffer.from(flow.description, 'base64').toString('utf8'))
        if (podsInfo.node === fogNodeUuid) {
          prev = prev.concat(podsInfo.metadata)
        }
      } catch (err) {
        logger.error(err)
      }

      return prev
    }, [])

  return pods
}

const kubeletGetCapacity = async function (fogNodeUuid, user, transaction) {
  const node = await IOFogService.getFogEndPoint({ uuid: fogNodeUuid }, user, false, transaction)

  return {
    cpu: node.cpuLimit,
    memory: `${(node.memoryLimit).toFixed(0)}Mi`,
    pods: `${NODE_CAPACITY}`
  }
}

const kubeletGetAllocatable = async function (fogNodeUuid, user, transaction) {
  const node = await IOFogService.getFogEndPoint({ uuid: fogNodeUuid }, user, false, transaction)

  const pods = await kubeletGetPods(fogNodeUuid, user, transaction)
  const allocatablePods = NODE_CAPACITY - (pods || []).length

  return {
    cpu: node.cpuLimit - node.cpuUsage,
    memory: `${(node.memoryLimit - node.memoryUsage).toFixed(0)}Mi`,
    pods: allocatablePods < 0 ? 0 : allocatablePods
  }
}

const kubeletGetNodeConditions = async function (fogNodeUuid, user, transaction) {
  const node = await IOFogService.getFogEndPoint({ uuid: fogNodeUuid }, user, false, transaction)
  const now = moment().utc().toISOString()
  const lastStatusTime = node.lastStatusTime ? moment(node.lastStatusTime).utc().toISOString() : null
  return [
    {
      type: 'Ready',
      status: node.daemonStatus === 'RUNNING' ? 'True' : 'False',
      lastHeartbeatTime: lastStatusTime,
      lastTransitionTime: now,
      reason: '',
      message: node.daemonStatus
    },
    {
      type: 'OutOfDisk',
      status: node.diskUsage >= node.diskLimit ? 'True' : 'False',
      lastHeartbeatTime: lastStatusTime,
      lastTransitionTime: now,
      reason: '',
      message: `Usage: ${node.diskUsage}, Limit: ${node.diskLimit}`
    },
    {
      type: 'MemoryPressure',
      status: (node.memoryUsage / node.memoryLimit) >= 0.9 ? 'True' : 'False',
      lastHeartbeatTime: lastStatusTime,
      lastTransitionTime: now,
      reason: '',
      message: `Usage: ${node.memoryUsage}, Limit: ${node.memoryLimit}`
    },
    {
      type: 'DiskPressure',
      status: (node.diskUsage / node.diskLimit) >= 0.9 ? 'True' : 'False',
      lastHeartbeatTime: lastStatusTime,
      lastTransitionTime: now,
      reason: '',
      message: `Usage: ${node.diskUsage}, Limit: ${node.diskLimit}`
    },
    {
      type: 'NetworkUnavailable',
      status: 'False',
      lastHeartbeatTime: lastStatusTime,
      lastTransitionTime: now,
      reason: '',
      message: ''
    }
  ]
}

const kubeletGetNodeAddresses = async function (fogNodeUuid, user, transaction) {
  const node = await IOFogService.getFogEndPoint({ uuid: fogNodeUuid }, user, false, transaction)
  return [
    {
      type: 'InternalIP',
      address: node.ipAddress ? node.ipAddress : '0.0.0.0'
    },
    {
      type: 'ExternalIP',
      address: node.ipAddressExternal ? node.ipAddressExternal : '0.0.0.0'
    }
  ]
}

const kubeletGetVkToken = async function (userId, transaction) {
  const newAccessToken = await KubeletAccessTokenService.generateAccessToken(transaction)
  await KubeletAccessTokenService.updateAccessToken(userId, newAccessToken, transaction)

  return {
    userId: userId,
    token: newAccessToken.token
  }
}

const kubeletGetSchedulerToken = async function (transaction) {
  // Not implemented yet. - userId is undefined
  // const newAccessToken = await SchedulerAccessTokenService.generateAccessToken(transaction)
  // await SchedulerAccessTokenService.updateAccessToken(userId, newAccessToken, transaction)

  // return {
  //   userId: userId,
  //   token: newAccessToken.token
  // }
}

const microservicesTopologicalOrder = function (msMetadata) {
  const microservices = []
  const graph = []
  msMetadata.forEach((ms, i) => {
    graph[i] = {
      edges: []
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

      node.edges = node.edges.filter((e) => `${e}` !== `${n}`)
      if (!node.edges.length) {
        stack.push(i)
      }
    })
  }

  const hasCircuit = !!graph.filter((node) => !!node.edges.length).length
  if (hasCircuit) {
    throw new Error('Circular dependency!!!')
  }

  return microservices.map((idx) => Object.assign({ originalIndex: idx }, msMetadata[idx]))
}

module.exports = {
  kubeletCreatePod: TransactionDecorator.generateTransaction(kubeletCreatePod),
  kubeletUpdatePod: TransactionDecorator.generateTransaction(kubeletUpdatePod),
  kubeletDeletePod: TransactionDecorator.generateTransaction(kubeletDeletePod),
  kubeletGetPod: TransactionDecorator.generateTransaction(kubeletGetPod),
  kubeletGetContainerLogs: TransactionDecorator.generateTransaction(kubeletGetContainerLogs),
  kubeletGetPodStatus: TransactionDecorator.generateTransaction(kubeletGetPodStatus),
  kubeletGetPods: TransactionDecorator.generateTransaction(kubeletGetPods),
  kubeletGetCapacity: TransactionDecorator.generateTransaction(kubeletGetCapacity),
  kubeletGetAllocatable: TransactionDecorator.generateTransaction(kubeletGetAllocatable),
  kubeletGetNodeConditions: TransactionDecorator.generateTransaction(kubeletGetNodeConditions),
  kubeletGetNodeAddresses: TransactionDecorator.generateTransaction(kubeletGetNodeAddresses),
  kubeletGetVkToken: TransactionDecorator.generateTransaction(kubeletGetVkToken),
  kubeletGetSchedulerToken: TransactionDecorator.generateTransaction(kubeletGetSchedulerToken)
}
