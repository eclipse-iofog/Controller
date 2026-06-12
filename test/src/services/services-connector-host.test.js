const { expect } = require('chai')
const sinon = require('sinon')

const ServicesService = require('../../../src/services/services-service')
const MicroserviceManager = require('../../../src/data/managers/microservice-manager')
const ApplicationManager = require('../../../src/data/managers/application-manager')
const Errors = require('../../../src/helpers/errors')

const EDGELET_BRIDGE_CONNECTOR_HOST = 'edgelet.default.bridge.local'

describe('services-service connector host', () => {
  def('sandbox', () => sinon.createSandbox())
  def('transaction', () => ({}))

  afterEach(() => $sandbox.restore())

  describe('_determineConnectorHost()', () => {
    def('subject', () => ServicesService._determineConnectorHost($serviceConfig, $transaction))

    describe('microservice (non-hostNetwork)', () => {
      def('serviceConfig', () => ({
        type: 'microservice',
        resource: 'ms-uuid-1',
        name: 'my-svc',
        targetPort: 8080
      }))
      def('microservice', () => ({
        uuid: 'ms-uuid-1',
        name: 'worker',
        applicationId: 42,
        hostNetworkMode: false,
        iofogUuid: 'fog-1'
      }))
      def('application', () => ({ id: 42, name: 'myapp' }))

      beforeEach(() => {
        $sandbox.stub(MicroserviceManager, 'findOne').resolves($microservice)
        $sandbox.stub(ApplicationManager, 'findOne').resolves($application)
      })

      it('returns appName.microserviceName', async () => {
        const host = await $subject
        expect(host).to.equal('myapp.worker')
      })
    })

    describe('microservice (hostNetwork)', () => {
      def('serviceConfig', () => ({
        type: 'microservice',
        resource: 'ms-uuid-2',
        name: 'host-svc',
        targetPort: 9090
      }))
      def('microservice', () => ({
        uuid: 'ms-uuid-2',
        name: 'daemon',
        applicationId: 7,
        hostNetworkMode: true,
        iofogUuid: 'fog-2'
      }))

      beforeEach(() => {
        $sandbox.stub(MicroserviceManager, 'findOne').resolves($microservice)
      })

      it('returns edgelet bridge connector host', async () => {
        const host = await $subject
        expect(host).to.equal(EDGELET_BRIDGE_CONNECTOR_HOST)
      })
    })

    describe('agent service', () => {
      def('serviceConfig', () => ({
        type: 'agent',
        resource: 'fog-agent-1',
        name: 'agent-svc',
        targetPort: 22
      }))

      it('returns edgelet bridge connector host', async () => {
        const host = await $subject
        expect(host).to.equal(EDGELET_BRIDGE_CONNECTOR_HOST)
      })
    })

    describe('k8s / external', () => {
      it('passes through resource for k8s', async () => {
        const host = await ServicesService._determineConnectorHost({
          type: 'k8s',
          resource: 'k8s-svc.default.svc.cluster.local',
          name: 'k8s-svc',
          targetPort: 443
        }, $transaction)
        expect(host).to.equal('k8s-svc.default.svc.cluster.local')
      })

      it('passes through resource for external', async () => {
        const host = await ServicesService._determineConnectorHost({
          type: 'external',
          resource: 'external.example.com',
          name: 'ext-svc',
          targetPort: 443
        }, $transaction)
        expect(host).to.equal('external.example.com')
      })
    })

    describe('errors', () => {
      def('serviceConfig', () => ({
        type: 'microservice',
        resource: 'missing-ms',
        name: 'bad-svc',
        targetPort: 80
      }))

      it('throws NotFoundError when microservice is missing', async () => {
        $sandbox.stub(MicroserviceManager, 'findOne').resolves(null)
        await expect($subject).to.be.rejectedWith(
          Errors.NotFoundError,
          /Microservice not found/
        )
      })

      it('throws NotFoundError when application is missing', async () => {
        $sandbox.stub(MicroserviceManager, 'findOne').resolves({
          uuid: 'ms-uuid',
          name: 'worker',
          applicationId: 99,
          hostNetworkMode: false
        })
        $sandbox.stub(ApplicationManager, 'findOne').resolves(null)
        await expect($subject).to.be.rejectedWith(
          Errors.NotFoundError,
          /Application not found/
        )
      })
    })
  })
})
