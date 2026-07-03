const config = require('./index')

const DEFAULT_RBAC_API_VERSION = 'datasance.com/v3'
const DEFAULT_CONTROLLER_DISTRIBUTION = 'datasance'
const DEFAULT_SERVICE_ANNOTATION_TAG = 'service.iofog.org/tag'
const DEFAULT_COMPONENT_LABEL_DOMAIN = 'iofog.org/component'
const DEFAULT_APP_LABEL = 'iofog'

const DISTRIBUTION_COMPONENT_LABEL = {
  datasance: 'datasance.com/component',
  iofog: 'iofog.org/component'
}

function getRbacApiVersion () {
  return process.env.RBAC_API_VERSION || config.get('flavor.rbacApiVersion', DEFAULT_RBAC_API_VERSION)
}

function getConfiguredDistribution () {
  if (process.env.CONTROLLER_DISTRIBUTION) {
    return process.env.CONTROLLER_DISTRIBUTION
  }
  const fromConfig = config.get('flavor.distribution')
  if (fromConfig != null && fromConfig !== '') {
    return fromConfig
  }
  return null
}

function getControllerDistribution () {
  return getConfiguredDistribution() || DEFAULT_CONTROLLER_DISTRIBUTION
}

function getServiceAnnotationTag () {
  return process.env.SERVICE_ANNOTATION_TAG || config.get('flavor.serviceAnnotationTag', DEFAULT_SERVICE_ANNOTATION_TAG)
}

function getComponentLabelKey () {
  if (process.env.COMPONENT_LABEL_DOMAIN) {
    return process.env.COMPONENT_LABEL_DOMAIN
  }
  const fromConfig = config.get('flavor.componentLabelDomain')
  if (fromConfig != null && fromConfig !== '') {
    return fromConfig
  }
  const distribution = getConfiguredDistribution()
  if (distribution != null && DISTRIBUTION_COMPONENT_LABEL[distribution]) {
    return DISTRIBUTION_COMPONENT_LABEL[distribution]
  }
  return DEFAULT_COMPONENT_LABEL_DOMAIN
}

function getAppLabelKey () {
  return process.env.APP_LABEL || config.get('flavor.defaultAppLabelKey', DEFAULT_APP_LABEL)
}

module.exports = {
  getRbacApiVersion,
  getControllerDistribution,
  getServiceAnnotationTag,
  getComponentLabelKey,
  getAppLabelKey
}
