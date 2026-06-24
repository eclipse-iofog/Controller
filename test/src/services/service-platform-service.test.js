const { expect } = require('chai')
const sinon = require('sinon')

const ServicePlatformService = require('../../../src/services/service-platform-service')
const ServiceManager = require('../../../src/data/managers/service-manager')
const ServicePlatformReconcileTaskManager = require('../../../src/data/managers/service-platform-reconcile-task-manager')
const FogPlatformReconcileTaskManager = require('../../../src/data/managers/fog-platform-reconcile-task-manager')
const HubRouterConfigLockManager = require('../../../src/data/managers/hub-router-config-lock-manager')
const RouterManager = require('../../../src/data/managers/router-manager')
const ServicesService = require('../../../src/services/services-service')
const K8sClient = require('../../../src/utils/k8s-client')
const config = require('../../../src/config')

describe('Service platform service', () => {
  def('sandbox', () => sinon.createSandbox())
  const transaction = {}
  const serviceName = 'api-gateway'

  afterEach(() => $sandbox.restore())

  describe('.unionTags()', () => {
    it('merges snapshot and current tag sets without duplicates', () => {
      const merged = ServicePlatformService.unionTags(
        [{ value: 'site-a' }, { value: 'site-b' }],
        ['site-b', 'site-c']
      )
      expect(merged).to.have.members(['site-a', 'site-b', 'site-c'])
    })
  })

  describe('.reconcileService()', () => {
    const service = {
      name: serviceName,
      type: 'external',
      resource: '10.0.0.8',
      defaultBridge: 'default-router',
      bridgePort: 9100,
      targetPort: 8080,
      servicePort: 9100,
      k8sType: 'LoadBalancer',
      tags: [{ value: 'site-a' }]
    }
    const task = {
      id: 42,
      serviceName,
      reason: 'spec-changed',
      specSnapshot: JSON.stringify({
        name: serviceName,
        type: 'external',
        resource: '10.0.0.8',
        defaultBridge: 'default-router',
        bridgePort: 9100,
        targetPort: 8080,
        servicePort: 9100,
        k8sType: 'LoadBalancer',
        tags: [{ value: 'site-a' }]
      })
    }

    beforeEach(() => {
      $sandbox.stub(config, 'get').callsFake((key, defaultValue) => {
        if (key === 'app.uuid') {
          return 'controller-uuid-1'
        }
        if (key === 'settings.hubRouterConfigLockTimeoutSeconds') {
          return 120
        }
        if (key === 'settings.serviceLoadBalancerWatchTimeoutSeconds') {
          return 300
        }
        return defaultValue
      })
      $sandbox.stub(ServicesService, 'checkKubernetesEnvironment').resolves(true)
      $sandbox.stub(HubRouterConfigLockManager, 'tryAcquire').resolves(true)
      $sandbox.stub(HubRouterConfigLockManager, 'release').resolves(true)
      $sandbox.stub(ServicesService, '_determineConnectorSiteId').resolves('default-router')
      $sandbox.stub(ServicesService, '_buildTcpConnector').resolves({
        name: `${serviceName}-connector`,
        host: '10.0.0.8',
        port: '8080',
        address: serviceName,
        processId: `${serviceName}-external-8080`
      })
      $sandbox.stub(ServicesService, '_buildTcpListener').returns({
        name: `${serviceName}-listener`,
        port: '9100',
        address: serviceName
      })
      $sandbox.stub(K8sClient, 'getConfigMap').resolves({
        data: {
          'skrouterd.json': JSON.stringify([])
        }
      })
      $sandbox.stub(K8sClient, 'patchConfigMap').resolves()
      $sandbox.stub(ServicesService, '_updateK8sService').resolves()
      $sandbox.stub(K8sClient, 'watchLoadBalancerIP').resolves('203.0.113.10')
      $sandbox.stub(ServicesService, 'handleServiceDistribution').resolves(['fog-a'])
      $sandbox.stub(FogPlatformReconcileTaskManager, 'enqueueFogPlatformReconcileTask').resolves({ id: 1 })
      $sandbox.stub(ServiceManager, 'findOneWithTags').resolves({ ...service, tags: [...service.tags] })
      $sandbox.stub(ServiceManager, 'update').resolves()
      $sandbox.stub(ServicePlatformReconcileTaskManager, 'delete').resolves()
    })

    it('runs hub reconcile, fan-out, and marks provisioning ready', async () => {
      const result = await ServicePlatformService.reconcileService(serviceName, task, transaction)

      expect(HubRouterConfigLockManager.tryAcquire).to.have.been.calledOnce
      expect(K8sClient.patchConfigMap).to.have.been.called
      expect(ServicesService._updateK8sService).to.have.been.calledOnce
      expect(K8sClient.watchLoadBalancerIP).to.have.been.calledOnce
      expect(HubRouterConfigLockManager.release).to.have.been.calledOnce
      expect(FogPlatformReconcileTaskManager.enqueueFogPlatformReconcileTask).to.have.been.calledWith({
        fogUuid: 'fog-a',
        reason: 'service-changed'
      }, transaction)
      expect(ServiceManager.update).to.have.been.calledWith(
        { name: serviceName },
        { provisioningStatus: 'ready', provisioningError: null },
        transaction
      )
      expect(result.provisioningStatus).to.equal('ready')
    })

    it('fans out fog reconcile to old and new tagged fogs from snapshot union', async () => {
      const tagChangeTask = {
        ...task,
        specSnapshot: JSON.stringify({
          ...JSON.parse(task.specSnapshot),
          tags: [{ value: 'site-a' }]
        })
      }

      ServiceManager.findOneWithTags.resolves({
        ...service,
        tags: [{ value: 'site-b' }]
      })
      ServicesService.handleServiceDistribution.resolves(['fog-a', 'fog-b', 'fog-c'])

      await ServicePlatformService.reconcileService(serviceName, tagChangeTask, transaction)

      expect(ServicesService.handleServiceDistribution).to.have.been.calledWith(
        ['site-a', 'site-b'],
        transaction
      )
      expect(FogPlatformReconcileTaskManager.enqueueFogPlatformReconcileTask).to.have.callCount(3)
    })

    it('is safe to reconcile the same service twice', async () => {
      await ServicePlatformService.reconcileService(serviceName, task, transaction)
      await ServicePlatformService.reconcileService(serviceName, task, transaction)

      expect(K8sClient.patchConfigMap.callCount).to.be.at.least(4)
    })

    it('throws when LoadBalancer IP watch times out', async () => {
      K8sClient.watchLoadBalancerIP.resolves(null)

      try {
        await ServicePlatformService.reconcileService(serviceName, task, transaction)
        throw new Error('expected reconcile to fail')
      } catch (error) {
        expect(error.message).to.include('LoadBalancer IP not assigned')
      }

      expect(HubRouterConfigLockManager.release).to.have.been.calledOnce
      expect(ServiceManager.update).to.not.have.been.calledWith(
        { name: serviceName },
        { provisioningStatus: 'ready', provisioningError: null },
        transaction
      )
    })
  })

  describe('.reconcileService() delete path', () => {
    const snapshot = {
      name: serviceName,
      type: 'external',
      resource: '10.0.0.8',
      defaultBridge: 'default-router',
      bridgePort: 9100,
      targetPort: 8080,
      servicePort: 9100,
      k8sType: 'LoadBalancer',
      tags: [{ value: 'site-a' }, { value: 'site-b' }]
    }
    const deleteTask = {
      id: 99,
      serviceName,
      reason: 'delete',
      specSnapshot: JSON.stringify(snapshot)
    }

    beforeEach(() => {
      $sandbox.stub(config, 'get').callsFake((key, defaultValue) => {
        if (key === 'app.uuid') {
          return 'controller-uuid-1'
        }
        return defaultValue
      })
      $sandbox.stub(ServicesService, 'checkKubernetesEnvironment').resolves(true)
      $sandbox.stub(HubRouterConfigLockManager, 'tryAcquire').resolves(true)
      $sandbox.stub(HubRouterConfigLockManager, 'release').resolves(true)
      $sandbox.stub(ServicesService, '_determineConnectorSiteId').resolves('default-router')
      $sandbox.stub(K8sClient, 'getConfigMap').resolves({
        data: {
          'skrouterd.json': JSON.stringify([
            ['tcpConnector', { name: `${serviceName}-connector` }],
            ['tcpListener', { name: `${serviceName}-listener` }]
          ])
        }
      })
      $sandbox.stub(K8sClient, 'patchConfigMap').resolves()
      $sandbox.stub(ServicesService, '_deleteK8sService').resolves()
      $sandbox.stub(ServicesService, 'handleServiceDistribution').resolves(['fog-a', 'fog-b'])
      $sandbox.stub(FogPlatformReconcileTaskManager, 'enqueueFogPlatformReconcileTask').resolves({ id: 1 })
      $sandbox.stub(ServicePlatformReconcileTaskManager, 'delete').resolves()
      $sandbox.stub(ServiceManager, 'findOneWithTags')
      $sandbox.stub(ServiceManager, 'update')
    })

    it('uses spec_snapshot for hub teardown, fan-out, and destroys the task', async () => {
      const result = await ServicePlatformService.reconcileService(serviceName, deleteTask, transaction)

      expect(ServiceManager.findOneWithTags).to.not.have.been.called
      expect(K8sClient.patchConfigMap).to.have.been.calledTwice
      expect(ServicesService._deleteK8sService).to.have.been.calledWith(serviceName)
      expect(ServicesService.handleServiceDistribution).to.have.been.calledWith(
        ['site-a', 'site-b'],
        transaction
      )
      expect(ServicePlatformReconcileTaskManager.delete).to.have.been.calledWith({ id: 99 }, transaction)
      expect(ServiceManager.update).to.not.have.been.called
      expect(result.isDelete).to.equal(true)
    })
  })

  describe('.acquireHubLockWithTimeout()', () => {
    let clock

    beforeEach(() => {
      clock = sinon.useFakeTimers()
      $sandbox.stub(config, 'get').callsFake((key, defaultValue) => {
        if (key === 'settings.hubRouterConfigLockTimeoutSeconds') {
          return 1
        }
        return defaultValue
      })
      $sandbox.stub(HubRouterConfigLockManager, 'tryAcquire').resolves(false)
    })

    afterEach(() => {
      clock.restore()
    })

    it('times out when hub lock is held by another controller', async () => {
      const acquirePromise = ServicePlatformService.acquireHubLockWithTimeout('controller-uuid-1', transaction)
      await clock.runAllAsync()

      try {
        await acquirePromise
        throw new Error('expected lock acquire to fail')
      } catch (error) {
        expect(error.message).to.include('Timed out waiting for hub router ConfigMap lock')
      }

      expect(HubRouterConfigLockManager.tryAcquire).to.have.been.called
    })
  })

  describe('.fanOutFogReconcile()', () => {
    beforeEach(() => {
      $sandbox.stub(ServicesService, 'handleServiceDistribution').resolves(['fog-a', 'fog-b'])
      $sandbox.stub(FogPlatformReconcileTaskManager, 'enqueueFogPlatformReconcileTask').resolves({ id: 1 })
    })

    it('enqueues fog platform reconcile tasks for distributed fogs', async () => {
      const fogUuids = await ServicePlatformService.fanOutFogReconcile(['site-a'], transaction)

      expect(fogUuids).to.eql(['fog-a', 'fog-b'])
      expect(FogPlatformReconcileTaskManager.enqueueFogPlatformReconcileTask).to.have.been.calledTwice
      expect(FogPlatformReconcileTaskManager.enqueueFogPlatformReconcileTask).to.have.been.calledWith({
        fogUuid: 'fog-a',
        reason: 'service-changed'
      }, transaction)
    })
  })

  describe('.upsertHubTcpListener()', () => {
    const serviceConfig = {
      name: serviceName,
      bridgePort: 9100
    }

    beforeEach(() => {
      $sandbox.stub(ServicesService, 'checkKubernetesEnvironment').resolves(true)
      $sandbox.stub(ServicesService, '_buildTcpListener').returns({
        name: `${serviceName}-listener`,
        port: '9100',
        address: serviceName
      })
      $sandbox.stub(K8sClient, 'getConfigMap').resolves({
        data: {
          'skrouterd.json': JSON.stringify([
            ['tcpListener', { name: 'other-listener', port: '8000', address: 'other' }]
          ])
        }
      })
      $sandbox.stub(K8sClient, 'patchConfigMap').resolves()
    })

    it('upserts hub listener entries in the K8s router ConfigMap', async () => {
      await ServicePlatformService.upsertHubTcpListener(serviceConfig, transaction)

      expect(K8sClient.patchConfigMap).to.have.been.calledOnce
      const patchData = K8sClient.patchConfigMap.firstCall.args[1]
      const routerConfig = JSON.parse(patchData.data['skrouterd.json'])
      expect(routerConfig).to.have.length(2)
      expect(routerConfig[1]).to.eql([
        'tcpListener',
        { name: `${serviceName}-listener`, port: '9100', address: serviceName }
      ])
    })
  })

  describe('.upsertHubTcpConnector()', () => {
    const serviceConfig = {
      name: serviceName,
      type: 'external',
      resource: '10.0.0.8',
      targetPort: 8080
    }

    beforeEach(() => {
      $sandbox.stub(ServicesService, 'checkKubernetesEnvironment').resolves(false)
      $sandbox.stub(ServicesService, '_determineConnectorSiteId').resolves('default-router')
      $sandbox.stub(ServicesService, '_buildTcpConnector').resolves({
        name: `${serviceName}-connector`,
        host: '10.0.0.8',
        port: '8080',
        address: serviceName,
        processId: `${serviceName}-external-8080`
      })
      $sandbox.stub(RouterManager, 'findOne').resolves({ iofogUuid: 'default-fog' })
    })

    it('upserts connector on the default router microservice when not on K8s CP', async () => {
      const FogManager = require('../../../src/data/managers/iofog-manager')
      const MicroserviceManager = require('../../../src/data/managers/microservice-manager')
      const ApplicationManager = require('../../../src/data/managers/application-manager')
      const ChangeTrackingService = require('../../../src/services/change-tracking-service')

      $sandbox.stub(FogManager, 'findOne').resolves({ uuid: 'default-fog', name: 'controlplane' })
      $sandbox.stub(ApplicationManager, 'findOne').resolves({ id: 10, name: 'system-controlplane', isSystem: true })
      $sandbox.stub(MicroserviceManager, 'findAll').resolves([])
      $sandbox.stub(MicroserviceManager, 'findOne').resolves({
        uuid: 'router-ms-1',
        config: JSON.stringify({ bridges: { tcpConnectors: {} } })
      })
      $sandbox.stub(MicroserviceManager, 'update').resolves()
      $sandbox.stub(MicroserviceManager, 'delete').resolves()
      $sandbox.stub(ChangeTrackingService, 'update').resolves()

      await ServicePlatformService.upsertHubTcpConnector(serviceConfig, transaction)

      expect(MicroserviceManager.update).to.have.been.calledOnce
      const updatePayload = MicroserviceManager.update.firstCall.args[1]
      const parsedConfig = JSON.parse(updatePayload.config)
      expect(parsedConfig.bridges.tcpConnectors[`${serviceName}-connector`]).to.include({
        name: `${serviceName}-connector`,
        host: '10.0.0.8'
      })
    })
  })
})
