/*
 *  *******************************************************************************
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

const config = require('../config')
const Constants = require('./constants')

function getControllerNamespace () {
  return process.env.CONTROLLER_NAMESPACE || config.get('app.namespace', 'datasance')
}

function buildRouterLocalCertificateHostList (fogData, { isDefaultRouter = false } = {}) {
  const hosts = new Set()
  const defaultHosts = [
    'localhost',
    '127.0.0.1',
    'host.docker.internal',
    'host.containers.internal',
    'iofog',
    'service.local'
  ]
  defaultHosts.forEach(host => hosts.add(host))
  if (fogData.host) hosts.add(fogData.host)
  if (fogData.ipAddress) hosts.add(fogData.ipAddress)
  if (fogData.ipAddressExternal) hosts.add(fogData.ipAddressExternal)
  hosts.add(Constants.ROUTER_BRIDGE_DNS_SAN)
  if (isDefaultRouter) {
    const namespace = getControllerNamespace()
    if (namespace) {
      hosts.add(`${Constants.DEFAULT_ROUTER_K8S_SERVICE}.${namespace}.svc.cluster.local`)
    }
  }
  return Array.from(hosts)
}

function routerLocalCertificateHosts (fogData, options) {
  const hosts = buildRouterLocalCertificateHostList(fogData, options)
  return hosts.join(',') || 'localhost'
}

function buildNatsServerCertificateHostList (fog) {
  const hosts = [fog.host, fog.ipAddress, fog.ipAddressExternal].filter(Boolean)
  if (hosts.length === 0) {
    hosts.push('localhost')
  }
  return hosts
}

function buildNatsMqttCertificateHostList (fog) {
  return [...new Set([...buildNatsServerCertificateHostList(fog), Constants.NATS_BRIDGE_DNS_SAN])]
}

module.exports = {
  getControllerNamespace,
  buildRouterLocalCertificateHostList,
  routerLocalCertificateHosts,
  buildNatsServerCertificateHostList,
  buildNatsMqttCertificateHostList
}
