/*
 * k8s-client integration test.
 * Uses namespace "local-test" by default (override with K8S_TEST_NAMESPACE).
 * Requires local kubeconfig (KUBECONFIG or ~/.kube/config).
 * Run with: nvm use 24 && npm run test:k8s-client
 * Skip when no namespace (e.g. K8S_TEST_NAMESPACE="" in CI without a cluster).
 */

const namespace = process.env.K8S_TEST_NAMESPACE || 'local-test'
if (namespace) {
  process.env.CONTROL_PLANE = 'kubernetes'
  process.env.CONTROLLER_NAMESPACE = namespace
  process.env.K8S_USE_LOCAL_KUBECONFIG = 'true'
}

const { expect } = require('chai')
const k8sClient = require('../../../src/utils/k8s-client')

const resourcePrefix = 'k8s-client-test-'
const testSecretName = resourcePrefix + 'secret'
const testConfigMapName = resourcePrefix + 'configmap'
const testServiceName = resourcePrefix + 'service'

describe('k8s-client integration', function () {
  let k8sApi
  let k8s

  before(async function () {
    if (!namespace) {
      this.skip()
      return
    }
    k8s = await import('@kubernetes/client-node')
    const kc = new k8s.KubeConfig()
    kc.loadFromDefault()
    k8sApi = kc.makeApiClient(k8s.CoreV1Api)
  })

  after(async function () {
    if (!k8sApi || !namespace) return
    try {
      await k8sApi.deleteNamespacedSecret({ name: testSecretName, namespace })
    } catch (_) {}
    try {
      await k8sApi.deleteNamespacedConfigMap({ name: testConfigMapName, namespace })
    } catch (_) {}
    try {
      await k8sApi.deleteNamespacedService({ name: testServiceName, namespace })
    } catch (_) {}
  })

  it('checkKubernetesEnvironment returns true when env is set', function () {
    if (!namespace) this.skip()
    expect(k8sClient.checkKubernetesEnvironment()).to.equal(true)
  })

  describe('Secrets', function () {
    before(async function () {
      if (!k8sApi || !namespace) this.skip()
      await k8sApi.createNamespacedSecret({
        namespace,
        body: {
          metadata: { name: testSecretName },
          type: 'Opaque',
          data: { key: Buffer.from('value').toString('base64') }
        }
      })
    })

    it('getSecret retrieves the created secret', async function () {
      if (!namespace) this.skip()
      const secret = await k8sClient.getSecret(testSecretName)
      expect(secret).to.be.an('object')
      expect(secret.metadata).to.be.an('object')
      expect(secret.metadata.name).to.equal(testSecretName)
      expect(secret.data).to.have.property('key')
    })
  })

  describe('ConfigMaps', function () {
    before(async function () {
      if (!k8sApi || !namespace) this.skip()
      await k8sApi.createNamespacedConfigMap({
        namespace,
        body: {
          metadata: { name: testConfigMapName },
          data: { foo: 'bar' }
        }
      })
    })

    it('getConfigMap retrieves the created configmap', async function () {
      if (!namespace) this.skip()
      const cm = await k8sClient.getConfigMap(testConfigMapName)
      expect(cm).to.be.an('object')
      expect(cm.metadata.name).to.equal(testConfigMapName)
      expect(cm.data).to.have.property('foo', 'bar')
    })

    it('patchConfigMap updates the configmap', async function () {
      if (!namespace) this.skip()
      const updated = await k8sClient.patchConfigMap(testConfigMapName, {
        data: { foo: 'baz', newKey: 'newValue' }
      })
      expect(updated.data).to.have.property('foo', 'baz')
      expect(updated.data).to.have.property('newKey', 'newValue')
    })
  })

  describe('Services', function () {
    it('createService creates a service', async function () {
      if (!namespace) this.skip()
      const spec = {
        metadata: { name: testServiceName },
        spec: {
          selector: { app: 'k8s-client-test' },
          ports: [{ port: 80, targetPort: 8080, name: 'http' }],
          type: 'ClusterIP'
        }
      }
      const svc = await k8sClient.createService(spec)
      expect(svc).to.be.an('object')
      expect(svc.metadata.name).to.equal(testServiceName)
      expect(svc.spec.type).to.equal('ClusterIP')
    })

    it('getNamespacedServices lists services including the test service', async function () {
      if (!namespace) this.skip()
      const list = await k8sClient.getNamespacedServices()
      expect(list).to.have.property('items').that.is.an('array')
      const found = list.items.find(s => s.metadata.name === testServiceName)
      expect(found).to.be.an('object')
    })

    it('getService retrieves the service', async function () {
      if (!namespace) this.skip()
      const svc = await k8sClient.getService(testServiceName)
      expect(svc.metadata.name).to.equal(testServiceName)
    })

    it('updateService patches the service', async function () {
      if (!namespace) this.skip()
      const updated = await k8sClient.updateService(testServiceName, {
        metadata: { annotations: { 'test-key': 'test-value' } }
      })
      expect(updated.metadata.annotations).to.have.property('test-key', 'test-value')
    })

    it('watchLoadBalancerIP returns null for ClusterIP service', async function () {
      if (!namespace) this.skip()
      const ip = await k8sClient.watchLoadBalancerIP(testServiceName, 1, 100)
      expect(ip).to.equal(null)
    })

    it('deleteService removes the service', async function () {
      if (!namespace) this.skip()
      const result = await k8sClient.deleteService(testServiceName)
      expect(result).to.be.an('object')
    })
  })

  describe('StatefulSet rollout', function () {
    const statefulSetName = 'nats'

    it('rolloutStatefulSet patches the nats StatefulSet and returns it', async function () {
      if (!namespace) this.skip()
      const result = await k8sClient.rolloutStatefulSet(statefulSetName)
      expect(result).to.be.an('object')
      expect(result.metadata).to.be.an('object')
      expect(result.metadata.name).to.equal(statefulSetName)
      expect(result.spec).to.have.property('template')
      const restartedAt = result.spec.template.metadata?.annotations?.['kubectl.kubernetes.io/restartedAt']
      expect(restartedAt).to.be.a('string')
      expect(new Date(restartedAt).getTime()).to.be.closeTo(Date.now(), 5000)
    })
  })
})
