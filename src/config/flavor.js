const config = require('./index')

const DEFAULT_RBAC_API_VERSION = 'datasance.com/v3'
const DEFAULT_CONTROLLER_DISTRIBUTION = 'datasance'
const DEFAULT_SERVICE_ANNOTATION_TAG = 'service.iofog.org/tag'
const DEFAULT_COMPONENT_LABEL_DOMAIN = 'iofog.org/component'
const DEFAULT_APP_LABEL = 'iofog'

function getRbacApiVersion () {
  return process.env.RBAC_API_VERSION || config.get('flavor.rbacApiVersion', DEFAULT_RBAC_API_VERSION)
}

function getControllerDistribution () {
  return process.env.CONTROLLER_DISTRIBUTION || config.get('flavor.distribution', DEFAULT_CONTROLLER_DISTRIBUTION)
}

function getServiceAnnotationTag () {
  return process.env.SERVICE_ANNOTATION_TAG || config.get('flavor.serviceAnnotationTag', DEFAULT_SERVICE_ANNOTATION_TAG)
}

function getComponentLabelKey () {
  return process.env.COMPONENT_LABEL_DOMAIN || config.get('flavor.componentLabelDomain', DEFAULT_COMPONENT_LABEL_DOMAIN)
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
