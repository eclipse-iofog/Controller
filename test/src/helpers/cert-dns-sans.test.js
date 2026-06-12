const { expect } = require('chai')

const Constants = require('../../../src/helpers/constants')
const {
  buildRouterLocalCertificateHostList,
  routerLocalCertificateHosts,
  buildNatsServerCertificateHostList,
  buildNatsMqttCertificateHostList
} = require('../../../src/helpers/cert-dns-sans')

describe('cert-dns-sans', () => {
  const originalNamespace = process.env.CONTROLLER_NAMESPACE

  afterEach(() => {
    if (originalNamespace === undefined) {
      delete process.env.CONTROLLER_NAMESPACE
    } else {
      process.env.CONTROLLER_NAMESPACE = originalNamespace
    }
  })

  describe('buildRouterLocalCertificateHostList()', () => {
    const fogData = {
      host: '10.0.0.5',
      ipAddress: '192.168.1.10',
      ipAddressExternal: '203.0.113.9'
    }

    it('always includes router bridge DNS SAN', () => {
      const hosts = buildRouterLocalCertificateHostList(fogData)

      expect(hosts).to.include(Constants.ROUTER_BRIDGE_DNS_SAN)
      expect(hosts).to.include.members(['localhost', '127.0.0.1', fogData.host, fogData.ipAddress, fogData.ipAddressExternal])
    })

    it('adds cluster.local SAN for default router when namespace is set', () => {
      process.env.CONTROLLER_NAMESPACE = 'edge-prod'

      const hosts = buildRouterLocalCertificateHostList(fogData, { isDefaultRouter: true })

      expect(hosts).to.include('router.edge-prod.svc.cluster.local')
    })

    it('does not add cluster.local SAN for non-default router', () => {
      process.env.CONTROLLER_NAMESPACE = 'edge-prod'

      const hosts = buildRouterLocalCertificateHostList(fogData, { isDefaultRouter: false })

      expect(hosts).to.not.include('router.edge-prod.svc.cluster.local')
    })

    it('joins hosts for routerLocalCertificateHosts()', () => {
      const hosts = routerLocalCertificateHosts(fogData, { isDefaultRouter: false })

      expect(hosts).to.be.a('string')
      expect(hosts.split(',')).to.include(Constants.ROUTER_BRIDGE_DNS_SAN)
    })
  })

  describe('buildNatsMqttCertificateHostList()', () => {
    const fog = {
      host: '10.0.0.8',
      ipAddress: '192.168.1.20'
    }

    it('includes fog network hosts for server cert only', () => {
      const hosts = buildNatsServerCertificateHostList(fog)

      expect(hosts).to.deep.equal([fog.host, fog.ipAddress])
      expect(hosts).to.not.include(Constants.NATS_BRIDGE_DNS_SAN)
    })

    it('adds NATS bridge DNS SAN for MQTT cert', () => {
      const hosts = buildNatsMqttCertificateHostList(fog)

      expect(hosts).to.include.members([fog.host, fog.ipAddress, Constants.NATS_BRIDGE_DNS_SAN])
    })

    it('falls back to localhost when fog has no network fields', () => {
      const hosts = buildNatsMqttCertificateHostList({})

      expect(hosts).to.deep.equal(['localhost', Constants.NATS_BRIDGE_DNS_SAN])
    })
  })
})
