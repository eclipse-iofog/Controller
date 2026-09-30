const { expect } = require('chai')

const Constants = require('../../../src/helpers/constants')
const {
  buildRouterLocalCertificateHostList,
  routerLocalCertificateHosts,
  buildNatsServerCertificateHostList,
  buildNatsMqttCertificateHostList,
  certificateHostsInclude
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
      expect(hosts).to.include.members(['localhost', '127.0.0.1', fogData.host])
      expect(hosts).to.not.include(fogData.ipAddress)
      expect(hosts).to.not.include(fogData.ipAddressExternal)
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

    it('includes the operator host and leaves fog IP addresses off the list', () => {
      const hosts = buildRouterLocalCertificateHostList({
        host: 'edge.example',
        ipAddress: '192.168.106.3',
        ipAddressExternal: '0.0.0.0'
      })

      expect(hosts).to.include('edge.example')
      expect(hosts).to.not.include('192.168.106.3')
      expect(hosts).to.not.include('0.0.0.0')
    })

    it('keeps an operator host of 0.0.0.0', () => {
      const hosts = buildRouterLocalCertificateHostList({
        host: '0.0.0.0',
        ipAddress: '0.0.0.0'
      })

      expect(hosts).to.include('0.0.0.0')
    })
  })

  describe('certificateHostsInclude()', () => {
    it('compares stored hosts as a set and ignores order, spaces, and empty entries', () => {
      expect(certificateHostsInclude(' b.example, a.example , ,', 'a.example')).to.equal(true)
      expect(certificateHostsInclude('a.example,b.example', 'b.example')).to.equal(true)
      expect(certificateHostsInclude('b.example', 'a.example')).to.equal(false)
      expect(certificateHostsInclude(null, 'a.example')).to.equal(false)
      expect(certificateHostsInclude('a.example', '  a.example  ')).to.equal(true)
      expect(certificateHostsInclude('a.example', '')).to.equal(true)
      expect(certificateHostsInclude('a.example', null)).to.equal(true)
    })
  })

  describe('buildNatsMqttCertificateHostList()', () => {
    const fog = {
      host: '10.0.0.8',
      ipAddress: '192.168.1.20'
    }

    it('uses the operator host for the server cert and omits fog IP addresses', () => {
      const hosts = buildNatsServerCertificateHostList(fog)

      expect(hosts).to.deep.equal([fog.host])
      expect(hosts).to.not.include(fog.ipAddress)
      expect(hosts).to.not.include(Constants.NATS_BRIDGE_DNS_SAN)
    })

    it('adds NATS bridge DNS SAN for MQTT cert', () => {
      const hosts = buildNatsMqttCertificateHostList(fog)

      expect(hosts).to.include.members([fog.host, Constants.NATS_BRIDGE_DNS_SAN])
      expect(hosts).to.not.include(fog.ipAddress)
    })

    it('falls back to localhost when fog has no network fields', () => {
      const hosts = buildNatsMqttCertificateHostList({})

      expect(hosts).to.deep.equal(['localhost', Constants.NATS_BRIDGE_DNS_SAN])
    })

    it('does not copy a previous fog IP onto the server host list', () => {
      const hosts = buildNatsServerCertificateHostList({
        host: 'edge.example',
        ipAddress: '192.168.106.3',
        ipAddressExternal: '176.234.134.187'
      })

      expect(hosts).to.deep.equal(['edge.example'])
    })
  })
})
