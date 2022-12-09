/* only "[a-zA-Z0-9][a-zA-Z0-9_.-]" are allowed
 * *******************************************************************************
 *  * Copyright (c) 2022 Edgeworx, Inc.
 *  *
 *  * This program and the accompanying materials are made available under the
 *  * terms of the Eclipse Public License v. 2.0 which is available at
 *  * http://www.eclipse.org/legal/epl-2.0
 *  *
 *  * SPDX-License-Identifier: EPL-2.0
 *  *******************************************************************************
 *
 */
const crypto = require('crypto')

const AppHelper = require('../../helpers/app-helper')
const CatalogService = require('../catalog-service')
const ChangeTrackingService = require('../change-tracking-service')
const MicroserviceManager = require('../../data/managers/microservice-manager')
const MicroservicePortManager = require('../../data/managers/microservice-port-manager')
const MicroserviceProxyPortManager = require('../../data/managers/microservice-proxy-port-manager')
const ProxyBrokerClient = require('../../helpers/proxy-broker-client')

async function _createOrUpdatePortRouterMicroservice (existingProxy, localPort, protocol, portRouterServerConfig, hostUuid, portRouterCatalogId, microserviceUuid, user, transaction) {
  const proxyConfig = {
    name: `${microserviceUuid}_${localPort}`,
    server_addr: portRouterServerConfig.host,
    server_port: portRouterServerConfig.adminPort,
    local_port: localPort,
    remote_port: portRouterServerConfig.proxyPort,
    type: protocol,
    proxy_token: portRouterServerConfig.proxyToken,
    server_token: portRouterServerConfig.serverToken,
    port_uuid: portRouterServerConfig.portUUID
  }

  if (existingProxy) {
    const config = JSON.parse(existingProxy.config || '{}')
    config.proxies = (config.proxies || []).concat(proxyConfig)
    existingProxy.config = JSON.stringify(config)
    await MicroserviceManager.updateIfChanged({ uuid: existingProxy.uuid }, { config: JSON.stringify(config) }, transaction)
    await ChangeTrackingService.update(hostUuid, ChangeTrackingService.events.microserviceConfig, transaction)
    return existingProxy
  }

  const proxyMicroserviceData = {
    uuid: AppHelper.generateRandomString(32),
    name: 'Proxy',
    config: JSON.stringify({
      fetch_config_interval: 5,
      proxies: [proxyConfig]
    }),
    catalogItemId: portRouterCatalogId,
    iofogUuid: hostUuid,
    rootHostAccess: true,
    registryId: 1,
    userId: user.id
  }
  const res = await MicroserviceManager.create(proxyMicroserviceData, transaction)
  await ChangeTrackingService.update(hostUuid, ChangeTrackingService.events.microserviceCommon, transaction)
  return res
}

async function createProxyPortMapping (microservice, portMappingData, user, transaction) {
  const protocol = portMappingData.protocol || 'tcp'

  // create proxy microservices
  const portRouterCatalog = await CatalogService.getPortRouterCatalogItem(transaction)

  const existingProxy = await MicroserviceManager.findOne({ catalogItemId: portRouterCatalog.id, iofogUuid: microservice.iofogUuid }, transaction)
  let serverToken = crypto.randomUUID()
  if (existingProxy) {
    const config = JSON.parse(existingProxy.config || '{}')
    serverToken = config.proxies[0].server_token
  }

  const portRouterServerConfig = await _portRouterServerConfig(serverToken)

  const localPortRouter = await _createOrUpdatePortRouterMicroservice(
    existingProxy,
    portMappingData.external,
    protocol,
    portRouterServerConfig,
    microservice.iofogUuid,
    portRouterCatalog.id,
    microservice.uuid,
    user,
    transaction)

  const mappingData = {
    isPublic: false,
    isProxy: true,
    portInternal: portMappingData.internal,
    portExternal: portMappingData.external,
    isUdp: protocol === 'udp',
    userId: microservice.userId,
    microserviceUuid: microservice.uuid
  }
  const port = await MicroservicePortManager.create(mappingData, transaction)

  const publicPort = {
    portId: port.id,
    host: portRouterServerConfig.host,
    adminPort: portRouterServerConfig.adminPort,
    localProxyId: localPortRouter.uuid,
    publicPort: portRouterServerConfig.proxyPort,
    proxyToken: portRouterServerConfig.proxyToken,
    portUUID: portRouterServerConfig.portUUID,
    serverToken: portRouterServerConfig.serverToken,
    protocol
  }
  await MicroserviceProxyPortManager.create(publicPort, transaction)

  return {
    proxy: {
      host: publicPort.host,
      port: publicPort.publicPort,
      protocol: publicPort.protocol
    }
  }
}

async function buildProxyPortMapping (pm, mapping, transaction) {
  const proxyPortMapping = await pm.getProxyPort()
  if (!proxyPortMapping) {
    return
  }

  mapping.proxy = {
    host: proxyPortMapping.host,
    port: proxyPortMapping.publicPort,
    protocol: proxyPortMapping.protocol
  }
}

async function deleteProxyPortMapping (microservice, portMapping, user, transaction) {
  const proxyPort = await portMapping.getProxyPort()
  if (proxyPort) {
    await _updateOrDeleteProxyMicroservice(proxyPort, false, transaction)
  }

  await MicroservicePortManager.delete({ id: portMapping.id }, transaction)
}

async function _updateOrDeleteProxyMicroservice (proxyPort, isMove, transaction) {
  const proxy = await MicroserviceManager.findOne({ uuid: proxyPort.localProxyId }, transaction)
  if (!proxy) {
    return
  }

  const config = JSON.parse(proxy.config || '{}')
  config.proxies = (config.proxies || []).filter(mapping => mapping.remote_port !== proxyPort.publicPort)
  const removeServerToken = config.proxies.length === 0

  if (!isMove) {
    await ProxyBrokerClient.deallocatePort(proxyPort.portUUID)
    if (removeServerToken) {
      await ProxyBrokerClient.revokeServerToken(proxyPort.serverToken)
    }
  }

  if (config.proxies.length === 0) {
    await MicroserviceManager.delete({ uuid: proxy.uuid }, transaction)
    await ChangeTrackingService.update(proxy.iofogUuid, ChangeTrackingService.events.microserviceConfig, transaction)
  } else {
    await MicroserviceManager.updateIfChanged({ uuid: proxy.uuid }, { config: JSON.stringify(config) }, transaction)
    await ChangeTrackingService.update(proxy.iofogUuid, ChangeTrackingService.events.microserviceCommon, transaction)
  }
}

async function moveProxyPortsToNewFog (updatedMicroservice, portMapping, user, transaction) {
  const proxyPort = await portMapping.getProxyPort()
  const localProxy = await MicroserviceManager.findOne({ uuid: proxyPort.localProxyId }, transaction)
  await _updateOrDeleteProxyMicroservice(proxyPort, true, transaction)

  const existingProxy = await MicroserviceManager.findOne({ catalogItemId: localProxy.catalogItemId, iofogUuid: updatedMicroservice.iofogUuid }, transaction)
  let serverToken = crypto.randomUUID()
  if (existingProxy) {
    const config = JSON.parse(existingProxy.config || '{}')
    serverToken = config.proxies[0].server_token
  }

  const portRouterServerConfig = {
    host: proxyPort.host,
    adminPort: proxyPort.adminPort,
    serverToken,
    proxyPort: proxyPort.proxyPort,
    proxyToken: proxyPort.proxyToken,
    portUUID: proxyPort.portUUID
  }

  const newProxy = await _createOrUpdatePortRouterMicroservice(
    existingProxy,
    portMapping.external,
    portMapping.protocol,
    portRouterServerConfig,
    updatedMicroservice.iofogUuid,
    localProxy.catalogItemId,
    updatedMicroservice.uuid,
    user,
    transaction)

  proxyPort.localProxyId = newProxy.uuid
  proxyPort.serverToken = portRouterServerConfig.serverToken
  await MicroserviceProxyPortManager.updateOrCreate({ id: proxyPort.id }, proxyPort.toJSON(), transaction)
}

async function _portRouterServerConfig (serverToken) {
  const allocatedPort = await ProxyBrokerClient.allocatePort(serverToken)
  return {
    host: allocatedPort.serverAddr,
    adminPort: allocatedPort.serverPort,
    serverToken,
    proxyPort: allocatedPort.proxyPort,
    proxyToken: allocatedPort.proxyToken,
    portUUID: allocatedPort.portUUID
  }
}

module.exports = {
  createProxyPortMapping: createProxyPortMapping,
  deleteProxyPortMapping: deleteProxyPortMapping,
  buildProxyPortMapping: buildProxyPortMapping,
  moveProxyPortsToNewFog: moveProxyPortsToNewFog
}
