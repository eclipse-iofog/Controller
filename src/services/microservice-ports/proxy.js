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

const AppHelper = require('../../helpers/app-helper')
const CatalogService = require('../catalog-service')
const ChangeTrackingService = require('../change-tracking-service')
const controllerConfig = require('../../config')
const MicroserviceManager = require('../../data/managers/microservice-manager')
const MicroservicePortManager = require('../../data/managers/microservice-port-manager')
const MicroserviceProxyPortManager = require('../../data/managers/microservice-proxy-port-manager')

async function _createOrUpdatePortRouterMicroservice (localPort, remotePort, protocol, portRouterServerConfig, hostUuid, portRouterCatalogId, microserviceUuid, user, transaction) {
  const existingProxy = await MicroserviceManager.findOne({ catalogItemId: portRouterCatalogId, iofogUuid: hostUuid }, transaction)
  if (existingProxy) {
    const config = JSON.parse(existingProxy.config || '{}')
    config.proxies = (config.proxies || []).concat({
      name: microserviceUuid,
      local_port: localPort,
      remote_port: remotePort,
      type: protocol
    })
    existingProxy.config = JSON.stringify(config)
    await MicroserviceManager.updateIfChanged({ uuid: existingProxy.uuid }, { config: JSON.stringify(config) }, transaction)
    await ChangeTrackingService.update(hostUuid, ChangeTrackingService.events.microserviceConfig, transaction)
    return existingProxy
  }

  const proxyMicroserviceData = {
    uuid: AppHelper.generateRandomString(32),
    name: 'Proxy',
    config: JSON.stringify({
      server_addr: portRouterServerConfig.host,
      server_port: portRouterServerConfig.port,
      oidc_client_id: portRouterServerConfig.oidcClientID,
      oidc_client_secret: portRouterServerConfig.oidcClientSecret,
      oidc_token_endpoint_url: portRouterServerConfig.oidcTokenEndpointURL,
      oidc_audience: portRouterServerConfig.oidcAudience,
      fetch_config_interval: 5,
      proxies: [
        {
          name: microserviceUuid,
          local_port: localPort,
          remote_port: remotePort,
          type: protocol
        }
      ]
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

  const proxyPort = Math.round(Math.random() * 998) + 6001
  const portRouterServerConfig = _portRouterServerConfig()

  // create proxy microservices
  const portRouterCatalog = await CatalogService.getPortRouterCatalogItem(transaction)

  const localPortRouter = await _createOrUpdatePortRouterMicroservice(
    portMappingData.external,
    proxyPort,
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
    adminPort: portRouterServerConfig.port,
    localProxyId: localPortRouter.uuid,
    publicPort: proxyPort,
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
    await _updateOrDeleteProxyMicroservice(proxyPort, transaction)
  }

  await MicroservicePortManager.delete({ id: portMapping.id }, transaction)
}

async function _updateOrDeleteProxyMicroservice (proxyPort, transaction) {
  const proxy = await MicroserviceManager.findOne({ uuid: proxyPort.localProxyId }, transaction)
  if (!proxy) {
    return
  }

  const config = JSON.parse(proxy.config || '{}')
  config.proxies = (config.proxies || []).filter(mapping => mapping.remote_port !== proxyPort.publicPort)

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
  await _updateOrDeleteProxyMicroservice(proxyPort, transaction)

  const portRouterServerConfig = _portRouterServerConfig(proxyPort.host, proxyPort.adminPort)
  const newProxy = await _createOrUpdatePortRouterMicroservice(
    portMapping.external,
    proxyPort.publicPort,
    portMapping.protocol,
    portRouterServerConfig,
    updatedMicroservice.iofogUuid,
    localProxy.catalogItemId,
    updatedMicroservice.uuid,
    user,
    transaction)

  proxyPort.localProxyId = newProxy.uuid
  await MicroserviceProxyPortManager.updateOrCreate({ id: proxyPort.id }, proxyPort.toJSON(), transaction)
}

function _portRouterServerConfig (host, port) {
  // TODO: Get these from port-manager service
  const publicHost = host || '20.236.39.65'
  const publicHostPort = port || 7001

  return {
    host: publicHost,
    port: publicHostPort,
    oidcClientID: process.env.MSVC_PORT_OIDC_CLIENT_ID || controllerConfig.get('PublicPorts:OIDC:CientId', ''),
    oidcClientSecret: process.env.MSVC_PORT_OIDC_CLIENT_SECRET || controllerConfig.get('PublicPorts:OIDC:ClientSecret', ''),
    oidcTokenEndpointURL: process.env.MSVC_PORT_OIDC_ENDPOINT || controllerConfig.get('PublicPorts:OIDC:Endpoint', ''),
    oidcAudience: process.env.MSVC_PORT_OIDC_AUDIENCE || controllerConfig.get('PublicPorts:OIDC:Audience', '')
  }
}

module.exports = {
  createProxyPortMapping: createProxyPortMapping,
  deleteProxyPortMapping: deleteProxyPortMapping,
  buildProxyPortMapping: buildProxyPortMapping,
  moveProxyPortsToNewFog: moveProxyPortsToNewFog
}
