const { expect } = require('chai')

const YamlParserService = require('../../../src/services/yaml-parser-service')

describe('YAML Parser Service', () => {
  describe('.parseAppFile()', () => {
    it('parses application natsConfig', async () => {
      const yaml = `
kind: Application
metadata:
  name: app-a
spec:
  natsConfig:
    natsAccess: true
    natsRule: app-rule
  microservices: []
`
      const result = await YamlParserService.parseAppFile(yaml)
      expect(result.natsConfig).to.eql({
        natsAccess: true,
        natsRule: 'app-rule'
      })
    })
  })

  describe('.parseMicroserviceFile()', () => {
    it('parses microservice natsConfig', async () => {
      const yaml = `
kind: Microservice
metadata:
  name: app-a/ms-a
spec:
  container:
    env: []
  natsConfig:
    natsAccess: true
    natsRule: user-rule
`
      const result = await YamlParserService.parseMicroserviceFile(yaml)
      expect(result.natsConfig).to.eql({
        natsAccess: true,
        natsRule: 'user-rule'
      })
      expect(result.application).to.eql('app-a')
      expect(result.name).to.eql('ms-a')
    })

    it('parses microservice natsEnabled', async () => {
      const yaml = `
kind: Microservice
metadata:
  name: app-a/ms-b
spec:
  container:
    env: []
  natsEnabled: true
`
      const result = await YamlParserService.parseMicroserviceFile(yaml)
      expect(result.natsEnabled).to.eql(true)
      expect(result.application).to.eql('app-a')
      expect(result.name).to.eql('ms-b')
    })

    it('does not map deprecated top-level natsAccess', async () => {
      const yaml = `
kind: Microservice
metadata:
  name: app-a/ms-c
spec:
  container:
    env: []
  natsAccess: true
`
      const result = await YamlParserService.parseMicroserviceFile(yaml)
      expect(result.natsAccess).to.eql(undefined)
    })
  })

  describe('NATS rule YAML parsing', () => {
    it('parses NatsAccountRule resource', async () => {
      const yaml = `
kind: NatsAccountRule
metadata:
  name: app-rule
spec:
  maxConnections: 100
  memStorage: -1
  diskStorage: -1
`
      const result = await YamlParserService.parseNatsAccountRuleFile(yaml)
      expect(result.name).to.equal('app-rule')
      expect(result.maxConnections).to.equal(100)
      expect(result.memStorage).to.equal(-1)
      expect(result.diskStorage).to.equal(-1)
      expect(result).to.not.have.property('jetstreamEnabled')
    })

    it('parses NatsUserRule resource', async () => {
      const yaml = `
kind: NatsUserRule
metadata:
  name: user-rule
spec:
  maxSubscriptions: 10
  allowedConnectionTypes:
    - STANDARD
`
      const result = await YamlParserService.parseNatsUserRuleFile(yaml)
      expect(result).to.eql({
        name: 'user-rule',
        maxSubscriptions: 10,
        allowedConnectionTypes: ['STANDARD']
      })
    })
  })
})
