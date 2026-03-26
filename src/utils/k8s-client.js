const logger = require('../logger')
const config = require('../config')

// Only set CONTROLLER_NAMESPACE if running in Kubernetes mode
let CONTROLLER_NAMESPACE = null

function checkKubernetesEnvironment () {
  const controlPlane = process.env.CONTROL_PLANE || config.get('app.ControlPlane')
  return controlPlane && controlPlane.toLowerCase() === 'kubernetes'
}

if (checkKubernetesEnvironment()) {
  CONTROLLER_NAMESPACE = process.env.CONTROLLER_NAMESPACE || config.get('app.namespace')

  // Validate that CONTROLLER_NAMESPACE is set when in Kubernetes mode
  if (!CONTROLLER_NAMESPACE) {
    logger.error('CONTROLLER_NAMESPACE environment variable is not set')
    throw new Error('CONTROLLER_NAMESPACE environment variable is not set')
  }
}

let k8sApi = null
let k8sAppsApi = null
let k8sModule = null
let kubeConfig = null

async function getK8sModule () {
  if (!k8sModule) {
    k8sModule = await import('@kubernetes/client-node')
  }
  return k8sModule
}

async function initializeK8sClient () {
  if (!k8sApi) {
    logger.debug('Initializing Kubernetes client')
    const k8s = await getK8sModule()
    kubeConfig = new k8s.KubeConfig()

    // Use local kubeconfig when requested (e.g. integration tests); otherwise in-cluster
    if (process.env.K8S_USE_LOCAL_KUBECONFIG === 'true' || process.env.K8S_USE_LOCAL_KUBECONFIG === '1') {
      kubeConfig.loadFromDefault()
    } else {
      kubeConfig.loadFromCluster()
    }
    k8sApi = kubeConfig.makeApiClient(k8s.CoreV1Api)
    k8sAppsApi = kubeConfig.makeApiClient(k8s.AppsV1Api)
    logger.info('Kubernetes client initialized successfully')
  }
  return k8sApi
}

async function getK8sAppsApi () {
  await initializeK8sClient()
  return k8sAppsApi
}

/**
 * Returns true if the error indicates a Kubernetes 404 Not Found.
 * Handles both axios-style (error.response.status) and body.code/body.reason.
 */
function isK8sNotFound (error) {
  if (!error) return false
  if (error.response && error.response.status === 404) return true
  const body = error.body || (error.response && error.response.body)
  if (body && (body.code === 404 || body.reason === 'NotFound')) return true
  return false
}

/**
 * Returns true if the error indicates a Kubernetes 409 Conflict.
 */
function isK8sConflict (error) {
  if (!error) return false
  if (error.response && error.response.status === 409) return true
  const body = error.body || (error.response && error.response.body)
  if (body && (body.code === 409 || body.reason === 'Conflict')) return true
  return false
}

function _normalizeK8sError (error, context) {
  const message = error && (error.message || String(error))
  logger.error(`${context}: ${message}`)
  if (error && typeof error.body !== 'undefined') {
    logger.error(`Error details: ${JSON.stringify(error.body)}`)
  }
}

function _responseBody (response) {
  return response && (response.body !== undefined ? response.body : response)
}

async function getSecret (secretName, options = {}) {
  const { ignoreNotFound = false } = options
  logger.debug(`Getting secret: ${secretName} in namespace: ${CONTROLLER_NAMESPACE}`)
  try {
    const api = await initializeK8sClient()
    const response = await api.readNamespacedSecret({ name: secretName, namespace: CONTROLLER_NAMESPACE })
    logger.info(`Successfully retrieved secret: ${secretName}`)
    return _responseBody(response)
  } catch (error) {
    if (ignoreNotFound && isK8sNotFound(error)) {
      logger.warn(`Secret ${secretName} not found (expected in some flows)`)
      return null
    }
    _normalizeK8sError(error, `Failed to get secret ${secretName}`)
    throw error
  }
}

async function getService (serviceName, options = {}) {
  const { ignoreNotFound = false } = options
  logger.debug(`Getting service: ${serviceName} in namespace: ${CONTROLLER_NAMESPACE}`)
  try {
    const api = await initializeK8sClient()
    const response = await api.readNamespacedService({ name: serviceName, namespace: CONTROLLER_NAMESPACE })
    logger.info(`Successfully retrieved service: ${serviceName}`)
    return _responseBody(response)
  } catch (error) {
    if (ignoreNotFound && isK8sNotFound(error)) {
      logger.warn(`Service ${serviceName} not found (expected in some flows)`)
      return null
    }
    _normalizeK8sError(error, `Failed to get service ${serviceName}`)
    throw error
  }
}

// ConfigMap methods
async function getConfigMap (configMapName, options = {}) {
  const { ignoreNotFound = false } = options
  logger.debug(`Getting ConfigMap: ${configMapName} in namespace: ${CONTROLLER_NAMESPACE}`)
  try {
    const api = await initializeK8sClient()
    const response = await api.readNamespacedConfigMap({ name: configMapName, namespace: CONTROLLER_NAMESPACE })
    logger.info(`Successfully retrieved ConfigMap: ${configMapName}`)
    return _responseBody(response)
  } catch (error) {
    if (ignoreNotFound && isK8sNotFound(error)) {
      logger.warn(`ConfigMap ${configMapName} not found (expected in some flows)`)
      return null
    }
    _normalizeK8sError(error, `Failed to get ConfigMap ${configMapName}`)
    throw error
  }
}

function _jsonPointerEscape (key) {
  return key.replace(/~/g, '~0').replace(/\//g, '~1')
}

async function patchConfigMap (configMapName, patchData, options = {}) {
  const { ignoreNotFound = false } = options
  logger.debug(`Patching ConfigMap: ${configMapName} in namespace: ${CONTROLLER_NAMESPACE}`)
  try {
    const api = await initializeK8sClient()
    const k8s = await getK8sModule()

    const data = patchData.data || {}
    const patch = Object.entries(data).map(([key, value]) => {
      const path = '/data/' + _jsonPointerEscape(key)
      let strValue = typeof value === 'string' ? value : JSON.stringify(value)
      if (key === 'skrouterd.json' && typeof value !== 'string') {
        strValue = JSON.stringify(value, null, 2)
      } else if (key === 'skrouterd.json' && typeof value === 'string') {
        try {
          strValue = JSON.stringify(JSON.parse(value), null, 2)
        } catch (_) {
          strValue = value
        }
      }
      return { op: 'replace', path, value: strValue }
    })

    if (patch.length === 0) {
      logger.warn('patchConfigMap called with no data keys')
      const response = await api.readNamespacedConfigMap({ name: configMapName, namespace: CONTROLLER_NAMESPACE })
      return _responseBody(response)
    }

    const patchOptions = (typeof k8s.setHeaderOptions === 'function' && k8s.PatchStrategy) != null
      ? k8s.setHeaderOptions('Content-Type', k8s.PatchStrategy.JsonPatch)
      : { headers: { 'Content-Type': 'application/json-patch+json' } }

    const response = await api.patchNamespacedConfigMap(
      { name: configMapName, namespace: CONTROLLER_NAMESPACE, body: patch },
      patchOptions
    )
    logger.info(`Successfully patched ConfigMap: ${configMapName}`)
    return _responseBody(response)
  } catch (error) {
    if (ignoreNotFound && isK8sNotFound(error)) {
      logger.warn(`ConfigMap ${configMapName} not found (expected in some flows, e.g. before operator creates it)`)
      return null
    }
    _normalizeK8sError(error, `Failed to patch ConfigMap ${configMapName}`)
    throw error
  }
}

// Service methods
async function getNamespacedServices () {
  logger.debug(`Listing services in namespace: ${CONTROLLER_NAMESPACE}`)
  try {
    const api = await initializeK8sClient()
    const response = await api.listNamespacedService({ namespace: CONTROLLER_NAMESPACE })
    const body = _responseBody(response)
    logger.info(`Successfully retrieved ${body && body.items ? body.items.length : 0} services in namespace: ${CONTROLLER_NAMESPACE}`)
    return body
  } catch (error) {
    _normalizeK8sError(error, `Failed to list services in namespace ${CONTROLLER_NAMESPACE}`)
    throw error
  }
}

async function createService (serviceSpec) {
  logger.debug(`Creating service in namespace: ${CONTROLLER_NAMESPACE}`)
  try {
    const api = await initializeK8sClient()
    const response = await api.createNamespacedService({ namespace: CONTROLLER_NAMESPACE, body: serviceSpec })
    const body = _responseBody(response)
    logger.info(`Successfully created service: ${body && body.metadata ? body.metadata.name : '?'} in namespace: ${CONTROLLER_NAMESPACE}`)
    return body
  } catch (error) {
    if (isK8sConflict(error)) {
      logger.warn(`Service already exists (409 Conflict) in namespace ${CONTROLLER_NAMESPACE}`)
    } else {
      _normalizeK8sError(error, `Failed to create service in namespace ${CONTROLLER_NAMESPACE}`)
    }
    throw error
  }
}

async function deleteService (serviceName, options = {}) {
  const { ignoreNotFound = false } = options
  logger.debug(`Deleting service: ${serviceName} in namespace: ${CONTROLLER_NAMESPACE}`)
  try {
    const api = await initializeK8sClient()
    const response = await api.deleteNamespacedService({ name: serviceName, namespace: CONTROLLER_NAMESPACE })
    logger.info(`Successfully deleted service: ${serviceName} from namespace: ${CONTROLLER_NAMESPACE}`)
    return _responseBody(response)
  } catch (error) {
    if (ignoreNotFound && isK8sNotFound(error)) {
      logger.warn(`Service ${serviceName} not found during delete (may have already been deleted)`)
      return null
    }
    _normalizeK8sError(error, `Failed to delete service ${serviceName}`)
    throw error
  }
}

/**
 * Updates a service using strategic merge patch
 * @param {string} serviceName - The name of the service to update
 * @param {Object} patchData - The patch data to apply to the service
 * @returns {Promise<Object>} The updated service object
 */
async function updateService (serviceName, patchData) {
  logger.debug(`Updating service: ${serviceName} in namespace: ${CONTROLLER_NAMESPACE}`)
  try {
    const api = await initializeK8sClient()
    const k8s = await getK8sModule()

    const patch = []

    // Update spec fields
    if (patchData.spec && patchData.spec.type) {
      patch.push({ op: 'replace', path: '/spec/type', value: patchData.spec.type })
    }
    if (patchData.spec && patchData.spec.selector) {
      patch.push({ op: 'replace', path: '/spec/selector', value: patchData.spec.selector })
    }
    if (patchData.spec && patchData.spec.ports) {
      patch.push({ op: 'replace', path: '/spec/ports', value: patchData.spec.ports })
    }

    // Update annotations
    if (patchData.metadata && patchData.metadata.annotations) {
      patch.push({ op: 'replace', path: '/metadata/annotations', value: patchData.metadata.annotations })
    }

    const patchOptions = (typeof k8s.setHeaderOptions === 'function' && k8s.PatchStrategy) != null
      ? k8s.setHeaderOptions('Content-Type', k8s.PatchStrategy.JsonPatch)
      : { headers: { 'Content-Type': 'application/json-patch+json' } }

    const response = await api.patchNamespacedService(
      { name: serviceName, namespace: CONTROLLER_NAMESPACE, body: patch },
      patchOptions
    )
    logger.info(`Successfully updated service: ${serviceName} in namespace: ${CONTROLLER_NAMESPACE}`)
    return _responseBody(response)
  } catch (error) {
    if (isK8sNotFound(error)) {
      logger.warn(`Service ${serviceName} not found during update`)
    } else {
      _normalizeK8sError(error, `Failed to update service ${serviceName}`)
    }
    throw error
  }
}

/**
 * Gets the LoadBalancer IP for a service if it exists
 * @param {string} serviceName - The name of the service
 * @param {number} maxRetries - Maximum number of retries (default: 30)
 * @param {number} retryInterval - Interval between retries in milliseconds (default: 2000)
 * @returns {Promise<string|null>} The LoadBalancer IP or null if not available after timeout
 */
async function watchLoadBalancerIP (serviceName, maxRetries = 10, retryInterval = 2000) {
  logger.debug(`Checking LoadBalancer IP for service: ${serviceName} in namespace: ${CONTROLLER_NAMESPACE}`)
  const api = await initializeK8sClient()

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await api.readNamespacedService({ name: serviceName, namespace: CONTROLLER_NAMESPACE })
      const service = _responseBody(response)

      // Check if the service type is LoadBalancer
      if (service.spec && service.spec.type === 'LoadBalancer') {
        // Check if the LoadBalancer IP exists
        if (service.status &&
            service.status.loadBalancer &&
            service.status.loadBalancer.ingress &&
            service.status.loadBalancer.ingress.length > 0) {
          const ingress = service.status.loadBalancer.ingress[0]
          if (ingress.ip) {
            logger.info(`Found LoadBalancer IP: ${ingress.ip} for service: ${serviceName}`)
            return ingress.ip
          } else if (ingress.hostname) {
            logger.info(`Found LoadBalancer hostname: ${ingress.hostname} for service: ${serviceName}`)
            return ingress.hostname
          }
        }
        logger.info(`Service ${serviceName} is LoadBalancer type but IP not yet assigned (attempt ${attempt + 1}/${maxRetries})`)
      } else {
        const serviceType = service.spec && service.spec.type ? service.spec.type : 'unknown'
        logger.info(`Service ${serviceName} is not of type LoadBalancer (type: ${serviceType})`)
        return null
      }

      // Wait before next retry
      await new Promise(resolve => setTimeout(resolve, retryInterval))
    } catch (error) {
      if (isK8sNotFound(error)) {
        logger.warn(`Service ${serviceName} not found while watching LoadBalancer IP`)
      } else {
        logger.error(`Error getting LoadBalancer IP for service ${serviceName}: ${error && error.message ? error.message : error}`)
      }
      await new Promise(resolve => setTimeout(resolve, retryInterval))
    }
  }

  logger.warn(`LoadBalancer IP not assigned for service ${serviceName} after ${maxRetries} attempts`)
  return null
}

/**
 * Trigger a rollout of a StatefulSet by patching the pod template annotation
 * kubectl.kubernetes.io/restartedAt to the current timestamp (RFC3339).
 * There is no direct rollout API; changing the pod template causes the controller to rolling-update.
 * @param {string} statefulSetName - Name of the StatefulSet
 * @returns {Promise<Object>} The patched StatefulSet
 */
async function rolloutStatefulSet (statefulSetName) {
  if (!CONTROLLER_NAMESPACE) {
    throw new Error('CONTROLLER_NAMESPACE is not set; cannot rollout StatefulSet')
  }
  logger.debug(`Rolling out StatefulSet: ${statefulSetName} in namespace: ${CONTROLLER_NAMESPACE}`)
  try {
    const api = await getK8sAppsApi()
    const k8s = await getK8sModule()
    const restartedAt = new Date().toISOString()
    const patch = {
      spec: {
        template: {
          metadata: {
            annotations: {
              'kubectl.kubernetes.io/restartedAt': restartedAt
            }
          }
        }
      }
    }
    const patchOptions = (typeof k8s.setHeaderOptions === 'function' && k8s.PatchStrategy) != null
      ? k8s.setHeaderOptions('Content-Type', 'application/merge-patch+json')
      : { headers: { 'Content-Type': 'application/merge-patch+json' } }
    const response = await api.patchNamespacedStatefulSet(
      { name: statefulSetName, namespace: CONTROLLER_NAMESPACE, body: patch },
      patchOptions
    )
    const body = _responseBody(response)
    logger.info(`Successfully rolled out StatefulSet: ${statefulSetName}`)
    return body
  } catch (error) {
    if (isK8sNotFound(error)) {
      logger.warn(`StatefulSet ${statefulSetName} not found during rollout`)
    } else if (isK8sConflict(error)) {
      logger.warn(`StatefulSet ${statefulSetName} conflict during rollout (409)`)
    } else {
      _normalizeK8sError(error, `Failed to rollout StatefulSet ${statefulSetName}`)
    }
    throw error
  }
}

module.exports = {
  isK8sNotFound,
  isK8sConflict,
  getSecret,
  getService,
  getConfigMap,
  patchConfigMap,
  getNamespacedServices,
  createService,
  deleteService,
  updateService,
  watchLoadBalancerIP,
  checkKubernetesEnvironment,
  rolloutStatefulSet
}
