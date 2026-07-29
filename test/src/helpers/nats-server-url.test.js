const { expect } = require('chai')

const Constants = require('../../../src/helpers/constants')
const Errors = require('../../../src/helpers/errors')
const { resolveNatsServerUrl } = require('../../../src/helpers/nats-server-url')

describe('helpers/nats-server-url', () => {
  describe('resolveNatsServerUrl()', () => {
    it('uses bridge DNS when fog has NATS and host network is disabled', () => {
      const url = resolveNatsServerUrl({
        hostNetworkMode: false,
        localNats: { serverPort: 4222 }
      })
      expect(url).to.equal(`nats://${Constants.NATS_BRIDGE_DNS_SAN}:4222`)
    })

    it('uses localhost when fog has NATS and host network is enabled', () => {
      const url = resolveNatsServerUrl({
        hostNetworkMode: true,
        localNats: { serverPort: 4223 }
      })
      expect(url).to.equal('nats://localhost:4223')
    })

    it('defaults local NATS serverPort to 4222', () => {
      const url = resolveNatsServerUrl({
        hostNetworkMode: false,
        localNats: { serverPort: null }
      })
      expect(url).to.equal(`nats://${Constants.NATS_BRIDGE_DNS_SAN}:4222`)
    })

    it('uses default hub host when fog has no local NATS', () => {
      const url = resolveNatsServerUrl({
        hub: { host: '10.0.0.5', serverPort: 4222 }
      })
      expect(url).to.equal('nats://10.0.0.5:4222')
    })

    it('defaults hub serverPort to 4222', () => {
      const url = resolveNatsServerUrl({
        hub: { host: 'hub.example.com', serverPort: null }
      })
      expect(url).to.equal('nats://hub.example.com:4222')
    })

    it('throws when fog has no local NATS and hub is missing', () => {
      expect(() => resolveNatsServerUrl({})).to.throw(
        Errors.ValidationError,
        'NATS hub not found'
      )
    })

    it('throws when fog has no local NATS and hub host is empty', () => {
      expect(() => resolveNatsServerUrl({ hub: { host: '', serverPort: 4222 } })).to.throw(
        Errors.ValidationError,
        'NATS hub not found'
      )
    })
  })
})
