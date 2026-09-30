const config = require('../config')
const Constants = require('./constants')

function getControllerNamespace () {
  return process.env.CONTROLLER_NAMESPACE || config.get('app.namespace', 'datasance')
}

function addOperatorHost (hosts, host) {
  if (host == null) return
  const trimmed = String(host).trim()
  if (trimmed) hosts.add(trimmed)
}

function parseStoredCertificateHosts (hosts) {
  if (hosts == null) return []
  return String(hosts)
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry !== '')
}

function certificateHostsInclude (hosts, operatorHost) {
  const needle = operatorHost == null ? '' : String(operatorHost).trim()
  if (!needle) return true
  return new Set(parseStoredCertificateHosts(hosts)).has(needle)
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
  addOperatorHost(hosts, fogData.host)
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
  const hosts = new Set()
  addOperatorHost(hosts, fog.host)
  if (hosts.size === 0) {
    hosts.add('localhost')
  }
  return Array.from(hosts)
}

function buildNatsMqttCertificateHostList (fog) {
  return [...new Set([...buildNatsServerCertificateHostList(fog), Constants.NATS_BRIDGE_DNS_SAN])]
}

module.exports = {
  getControllerNamespace,
  certificateHostsInclude,
  parseStoredCertificateHosts,
  buildRouterLocalCertificateHostList,
  routerLocalCertificateHosts,
  buildNatsServerCertificateHostList,
  buildNatsMqttCertificateHostList
}
