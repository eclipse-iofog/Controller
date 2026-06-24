const { expect } = require('chai')
const sinon = require('sinon')

const ServiceController = require('../../../src/controllers/service-controller')
const YamlParserService = require('../../../src/services/yaml-parser-service')
const ServicesService = require('../../../src/services/services-service')
const ServiceManager = require('../../../src/data/managers/service-manager')
const ServicePlatformReconcileTaskManager = require('../../../src/data/managers/service-platform-reconcile-task-manager')
const RouterManager = require('../../../src/data/managers/router-manager')
const TagsManager = require('../../../src/data/managers/tags-manager')
const Validator = require('../../../src/schemas')
const Errors = require('../../../src/helpers/errors')

describe('services-service platform reconcile enqueue', () => {
  def('sandbox', () => sinon.createSandbox())
  def('transaction', () => ({}))

  afterEach(() => {
    delete process.env.CONTROL_PLANE
    $sandbox.restore()
  })

  function buildServiceModel (fields = {}) {
    const service = {
      id: 1,
      name: 'api-gateway',
      type: 'external',
      resource: '10.0.0.8',
      defaultBridge: 'default-router',
      bridgePort: 9100,
      targetPort: 8080,
      servicePort: 9100,
      k8sType: 'LoadBalancer',
      serviceEndpoint: 'hub.example.com',
      provisioningStatus: 'pending',
      provisioningError: null,
      tags: [],
      ...fields
    }
    service.setTags = fields.setTags || sinon.stub().resolves()
    return service
  }

  function stubCreateDeps () {
    delete process.env.CONTROL_PLANE
    $sandbox.stub(Validator, 'validate').resolves(true)
    $sandbox.stub(ServiceManager, 'findAll').resolves([])
    $sandbox.stub(ServiceManager, 'create').callsFake((data) => Promise.resolve(buildServiceModel(data)))
    $sandbox.stub(ServicePlatformReconcileTaskManager, 'enqueueServicePlatformReconcileTask').resolves()
    $sandbox.stub(RouterManager, 'findOne').resolves({
      isDefault: true,
      host: 'hub.example.com',
      iofogUuid: 'default-fog'
    })
    $sandbox.stub(TagsManager, 'findOne').resolves(null)
    $sandbox.stub(TagsManager, 'create').callsFake(({ value }) => Promise.resolve({ value }))
  }

  describe('.createServiceEndpoint()', () => {
    def('serviceData', () => ({
      name: 'api-gateway',
      type: 'external',
      resource: '10.0.0.8',
      defaultBridge: 'default-router',
      targetPort: 8080,
      tags: ['site-a']
    }))
    def('subject', () => ServicesService.createServiceEndpoint($serviceData, $transaction))

    beforeEach(() => {
      stubCreateDeps()
    })

    it('sets provisioningStatus pending and enqueues reconcile task', async () => {
      await $subject

      expect(ServiceManager.create).to.have.been.calledOnce
      const createPayload = ServiceManager.create.firstCall.args[0]
      expect(createPayload.provisioningStatus).to.equal('pending')
      expect(createPayload.provisioningError).to.be.null

      expect(ServicePlatformReconcileTaskManager.enqueueServicePlatformReconcileTask).to.have.been.calledWith({
        serviceName: 'api-gateway',
        reason: 'spec-changed',
        specSnapshot: {
          name: 'api-gateway',
          type: 'external',
          resource: '10.0.0.8',
          defaultBridge: 'default-router',
          bridgePort: 10024,
          targetPort: 8080,
          servicePort: 10024,
          k8sType: undefined,
          serviceEndpoint: 'hub.example.com',
          tags: ['site-a']
        }
      }, $transaction)
    })

    it('does not use setImmediate for provisioning', async () => {
      const setImmediateSpy = $sandbox.spy(global, 'setImmediate')
      await $subject
      expect(setImmediateSpy).to.not.have.been.called
    })

    it('does not run hub provisioning on the synchronous path', async () => {
      $sandbox.stub(ServicesService, '_addTcpConnector').resolves()
      $sandbox.stub(ServicesService, '_addTcpListener').resolves()
      $sandbox.stub(ServicesService, '_createK8sService').resolves()

      await $subject

      expect(ServicesService._addTcpConnector).to.not.have.been.called
      expect(ServicesService._addTcpListener).to.not.have.been.called
      expect(ServicesService._createK8sService).to.not.have.been.called
    })
  })

  describe('.updateServiceEndpoint()', () => {
    const existingService = buildServiceModel({
      tags: [{ value: 'site-a' }]
    })

    def('serviceData', () => ({
      name: 'api-gateway',
      targetPort: 9090,
      tags: ['site-b']
    }))
    def('subject', () => ServicesService.updateServiceEndpoint('api-gateway', $serviceData, $transaction))

    beforeEach(() => {
      delete process.env.CONTROL_PLANE
      $sandbox.stub(Validator, 'validate').resolves(true)
      $sandbox.stub(ServiceManager, 'findOneWithTags').resolves(existingService)
      $sandbox.stub(ServiceManager, 'update').callsFake((where, data) =>
        Promise.resolve(buildServiceModel({ ...existingService, ...data }))
      )
      $sandbox.stub(ServicePlatformReconcileTaskManager, 'enqueueServicePlatformReconcileTask').resolves()
      $sandbox.stub(RouterManager, 'findOne').resolves({
        isDefault: true,
        host: 'hub.example.com',
        iofogUuid: 'default-fog'
      })
      $sandbox.stub(TagsManager, 'findOne').resolves(null)
      $sandbox.stub(TagsManager, 'create').callsFake(({ value }) => Promise.resolve({ value }))
    })

    it('enqueues reconcile with old and new tags in snapshot', async () => {
      await $subject

      expect(ServicePlatformReconcileTaskManager.enqueueServicePlatformReconcileTask).to.have.been.calledWith({
        serviceName: 'api-gateway',
        reason: 'spec-changed',
        specSnapshot: {
          name: 'api-gateway',
          type: 'external',
          resource: '10.0.0.8',
          defaultBridge: 'default-router',
          bridgePort: 9100,
          targetPort: 9090,
          servicePort: 9100,
          k8sType: 'LoadBalancer',
          serviceEndpoint: 'hub.example.com',
          tags: ['site-a', 'site-b']
        }
      }, $transaction)
    })

    it('does not use setImmediate for provisioning', async () => {
      const setImmediateSpy = $sandbox.spy(global, 'setImmediate')
      await $subject
      expect(setImmediateSpy).to.not.have.been.called
    })
  })

  describe('.deleteServiceEndpoint()', () => {
    const existingService = buildServiceModel({
      tags: [{ value: 'site-a' }]
    })

    def('subject', () => ServicesService.deleteServiceEndpoint('api-gateway', $transaction))

    beforeEach(() => {
      $sandbox.stub(ServiceManager, 'findOneWithTags').resolves(existingService)
      $sandbox.stub(ServiceManager, 'delete').resolves()
      $sandbox.stub(ServicePlatformReconcileTaskManager, 'enqueueServicePlatformReconcileTask').resolves()
      $sandbox.stub(ServicesService, '_deleteTcpConnector').resolves()
      $sandbox.stub(ServicesService, '_deleteTcpListener').resolves()
      $sandbox.stub(ServicesService, '_deleteK8sService').resolves()
    })

    it('captures spec snapshot and enqueues delete reconcile before DB delete', async () => {
      await $subject

      expect(ServicePlatformReconcileTaskManager.enqueueServicePlatformReconcileTask).to.have.been.calledBefore(
        ServiceManager.delete
      )
      expect(ServicePlatformReconcileTaskManager.enqueueServicePlatformReconcileTask).to.have.been.calledWith({
        serviceName: 'api-gateway',
        reason: 'delete',
        specSnapshot: {
          name: 'api-gateway',
          type: 'external',
          resource: '10.0.0.8',
          defaultBridge: 'default-router',
          bridgePort: 9100,
          targetPort: 8080,
          servicePort: 9100,
          k8sType: 'LoadBalancer',
          serviceEndpoint: 'hub.example.com',
          tags: ['site-a']
        }
      }, $transaction)
      expect(ServiceManager.delete).to.have.been.calledWith({ name: 'api-gateway' }, $transaction)
    })

    it('does not run hub teardown on the synchronous path', async () => {
      await $subject

      expect(ServicesService._deleteTcpConnector).to.not.have.been.called
      expect(ServicesService._deleteTcpListener).to.not.have.been.called
      expect(ServicesService._deleteK8sService).to.not.have.been.called
    })
  })

  describe('YAML endpoints', () => {
    const serviceYaml = `
apiVersion: datasance.com/v3
kind: Service
metadata:
  name: api-gateway
  tags:
    - site-a
spec:
  type: external
  resource: 10.0.0.8
  defaultBridge: default-router
  targetPort: 8080
`

    describe('create', () => {
      beforeEach(() => {
        stubCreateDeps()
        $sandbox.stub(YamlParserService, 'parseServiceFile').resolves({
          name: 'api-gateway',
          type: 'external',
          resource: '10.0.0.8',
          defaultBridge: 'default-router',
          targetPort: 8080,
          tags: ['site-a']
        })
      })

      it('createServiceYAMLEndpoint parses YAML and enqueues reconcile task', async () => {
        const req = {
          file: {
            buffer: Buffer.from(serviceYaml)
          }
        }

        await ServiceController.createServiceYAMLEndpoint(req)

        expect(YamlParserService.parseServiceFile).to.have.been.calledOnceWith(serviceYaml)
        expect(ServicePlatformReconcileTaskManager.enqueueServicePlatformReconcileTask).to.have.been.calledWith({
          serviceName: 'api-gateway',
          reason: 'spec-changed',
          specSnapshot: sinon.match({
            name: 'api-gateway',
            tags: ['site-a']
          })
        }, sinon.match.any)
      })
    })

    describe('update', () => {
      const existingService = buildServiceModel({
        tags: [{ value: 'site-a' }]
      })

      beforeEach(() => {
        delete process.env.CONTROL_PLANE
        $sandbox.stub(Validator, 'validate').resolves(true)
        $sandbox.stub(ServiceManager, 'findOneWithTags').resolves(existingService)
        $sandbox.stub(ServiceManager, 'update').callsFake((where, data) =>
          Promise.resolve(buildServiceModel({ ...existingService, ...data }))
        )
        $sandbox.stub(ServicePlatformReconcileTaskManager, 'enqueueServicePlatformReconcileTask').resolves()
        $sandbox.stub(RouterManager, 'findOne').resolves({
          isDefault: true,
          host: 'hub.example.com',
          iofogUuid: 'default-fog'
        })
        $sandbox.stub(TagsManager, 'findOne').resolves(null)
        $sandbox.stub(TagsManager, 'create').callsFake(({ value }) => Promise.resolve({ value }))
        $sandbox.stub(YamlParserService, 'parseServiceFile').resolves({
          name: 'api-gateway',
          tags: ['site-b'],
          targetPort: 9090
        })
      })

      it('updateServiceYAMLEndpoint parses YAML and enqueues reconcile task', async () => {
        const req = {
          params: { name: 'api-gateway' },
          file: {
            buffer: Buffer.from(serviceYaml)
          }
        }

        await ServiceController.updateServiceYAMLEndpoint(req)

        expect(YamlParserService.parseServiceFile).to.have.been.calledOnceWith(serviceYaml, {
          isUpdate: true,
          serviceName: 'api-gateway'
        })
        expect(ServicePlatformReconcileTaskManager.enqueueServicePlatformReconcileTask).to.have.been.calledWith({
          serviceName: 'api-gateway',
          reason: 'spec-changed',
          specSnapshot: sinon.match({
            name: 'api-gateway',
            tags: ['site-a', 'site-b']
          })
        }, sinon.match.any)
      })
    })
  })

  describe('.reconcileServiceEndpoint()', () => {
    def('subject', () => ServicesService.reconcileServiceEndpoint('api-gateway', $transaction))

    beforeEach(() => {
      $sandbox.stub(ServiceManager, 'findOneWithTags').resolves(buildServiceModel({
        provisioningStatus: 'failed',
        provisioningError: 'hub lock timeout',
        tags: [{ value: 'site-a' }]
      }))
      $sandbox.stub(ServiceManager, 'update').resolves()
      $sandbox.stub(ServicePlatformReconcileTaskManager, 'enqueueServicePlatformReconcileTask').resolves()
    })

    it('resets failed provisioning and enqueues manual retry', async () => {
      const result = await $subject

      expect(ServiceManager.update).to.have.been.calledWith(
        { name: 'api-gateway' },
        { provisioningStatus: 'pending', provisioningError: null },
        $transaction
      )
      expect(ServicePlatformReconcileTaskManager.enqueueServicePlatformReconcileTask).to.have.been.calledWith({
        serviceName: 'api-gateway',
        reason: 'manual-retry',
        specSnapshot: sinon.match({
          name: 'api-gateway',
          tags: ['site-a']
        })
      }, $transaction)
      expect(result.provisioningStatus).to.equal('pending')
      expect(result.provisioningError).to.be.null
    })

    context('when service is missing', () => {
      beforeEach(() => {
        ServiceManager.findOneWithTags.resolves(null)
      })

      it('rejects with NotFoundError', () =>
        expect($subject).to.be.rejectedWith(Errors.NotFoundError))
    })
  })
})
