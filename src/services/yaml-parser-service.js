const Errors = require('../helpers/errors')
const lget = require('lodash/get')
const yaml = require('js-yaml')

async function parseAppFile (fileContent) {
  const doc = yaml.load(fileContent)
  if (doc.kind !== 'Application') {
    throw new Errors.ValidationError(`Invalid kind ${doc.kind}`)
  }
  if (doc.metadata == null || doc.spec == null) {
    throw new Errors.ValidationError('Invalid YAML format')
  }
  const application = {
    name: lget(doc, 'metadata.name', undefined),
    ...(await parseAppYAML(doc.spec))
  }
  return application
}

async function parseAppYAML (app) {
  const application = {
    ...app,
    isActivated: app.isActivated || true,
    natsConfig: lget(app, 'natsConfig', undefined),
    microservices: await Promise.all((app.microservices || []).map(async (m) => parseMicroserviceYAML(m)))
  }
  return application
}

async function parseAppTemplateFile (fileContent) {
  const doc = yaml.load(fileContent)
  if (doc.kind !== 'ApplicationTemplate') {
    throw new Errors.ValidationError(`Invalid kind ${doc.kind}`)
  }
  if (doc.metadata == null || doc.spec == null) {
    throw new Errors.ValidationError('Invalid YAML format')
  }
  const appTemplate = {
    name: lget(doc, 'metadata.name', undefined),
    application: await parseAppYAML(doc.spec.application),
    description: doc.spec.description,
    variables: doc.spec.variables
  }
  _deleteUndefinedFields(appTemplate)
  return appTemplate
}

async function parseSecretFile (fileContent, options = {}) {
  try {
    const doc = yaml.load(fileContent)
    if (!doc || !doc.kind) {
      throw new Errors.ValidationError(`Invalid YAML format: missing kind field`)
    }
    if (doc.kind !== 'Secret') {
      throw new Errors.ValidationError(`Invalid kind ${doc.kind}`)
    }
    if (doc.metadata == null || doc.type == null || doc.data == null) {
      throw new Errors.ValidationError('Invalid YAML format: missing metadata or spec')
    }

    // If this is an update, validate that the name matches
    if (options.isUpdate && options.secretName) {
      if (doc.metadata.name !== options.secretName) {
        throw new Errors.ValidationError(`Secret name in YAML (${doc.metadata.name}) doesn't match endpoint path (${options.secretName})`)
      }

      // For updates, we only need the data
      return {
        data: doc.data
      }
    }

    // For creates, return full object
    return {
      name: lget(doc, 'metadata.name', undefined),
      type: doc.spec.type,
      data: doc.data
    }
  } catch (error) {
    if (error instanceof Errors.ValidationError) {
      throw error
    }
    throw new Errors.ValidationError(`Error parsing YAML: ${error.message}`)
  }
}

async function parseVolumeMountFile (fileContent, options = {}) {
  try {
    const doc = yaml.load(fileContent)
    if (!doc || !doc.kind) {
      throw new Errors.ValidationError(`Invalid YAML format: missing kind field`)
    }
    if (doc.kind !== 'VolumeMount') {
      throw new Errors.ValidationError(`Invalid kind ${doc.kind}`)
    }
    if (doc.metadata == null || doc.spec == null) {
      throw new Errors.ValidationError('Invalid YAML format: missing metadata or spec')
    }

    // Validate that either secretName or configMapName is provided, but not both
    if (doc.spec.secretName && doc.spec.configMapName) {
      throw new Errors.ValidationError('Cannot specify both secretName and configMapName')
    }
    if (!doc.spec.secretName && !doc.spec.configMapName) {
      throw new Errors.ValidationError('Must specify either secretName or configMapName')
    }

    // If this is an update, validate that the name matches
    if (options.isUpdate && options.volumeMountName) {
      if (doc.metadata.name !== options.volumeMountName) {
        throw new Errors.ValidationError(`VolumeMount name in YAML (${doc.metadata.name}) doesn't match endpoint path (${options.volumeMountName})`)
      }

      return {
        name: lget(doc, 'metadata.name', undefined),
        secretName: doc.spec.secretName,
        configMapName: doc.spec.configMapName
      }
    }

    // For creates, return full object
    return {
      name: lget(doc, 'metadata.name', undefined),
      secretName: doc.spec.secretName,
      configMapName: doc.spec.configMapName
    }
  } catch (error) {
    if (error instanceof Errors.ValidationError) {
      throw error
    }
    throw new Errors.ValidationError(`Error parsing YAML: ${error.message}`)
  }
}

async function parseConfigMapFile (fileContent, options = {}) {
  try {
    const doc = yaml.load(fileContent)
    if (!doc || !doc.kind) {
      throw new Errors.ValidationError(`Invalid YAML format: missing kind field`)
    }
    if (doc.kind !== 'ConfigMap') {
      throw new Errors.ValidationError(`Invalid kind ${doc.kind}`)
    }
    if (doc.metadata == null || doc.data == null) {
      throw new Errors.ValidationError('Invalid YAML format: missing metadata or spec')
    }

    // If this is an update, validate that the name matches
    if (options.isUpdate && options.configMapName) {
      if (doc.metadata.name !== options.configMapName) {
        throw new Errors.ValidationError(`ConfigMap name in YAML (${doc.metadata.name}) doesn't match endpoint path (${options.configMapName})`)
      }

      // For updates, return data and useVault if provided
      const result = {
        data: doc.data,
        immutable: doc.spec.immutable
      }
      if (doc.spec && doc.spec.useVault !== undefined) {
        result.useVault = doc.spec.useVault
      }
      return result
    }

    // For creates, return full object
    const result = {
      name: lget(doc, 'metadata.name', undefined),
      data: doc.data,
      immutable: doc.spec.immutable
    }
    // Include useVault if specified in YAML
    if (doc.spec && doc.spec.useVault !== undefined) {
      result.useVault = doc.spec.useVault
    }
    return result
  } catch (error) {
    if (error instanceof Errors.ValidationError) {
      throw error
    }
    throw new Errors.ValidationError(`Error parsing YAML: ${error.message}`)
  }
}

async function parseServiceFile (fileContent, options = {}) {
  try {
    const doc = yaml.load(fileContent)
    if (!doc || !doc.kind) {
      throw new Errors.ValidationError(`Invalid YAML format: missing kind field`)
    }
    if (doc.kind !== 'Service') {
      throw new Errors.ValidationError(`Invalid kind ${doc.kind}`)
    }
    if (doc.metadata == null || doc.spec == null) {
      throw new Errors.ValidationError('Invalid YAML format: missing metadata or spec')
    }

    // If this is an update, validate that the name matches
    if (options.isUpdate && options.serviceName) {
      if (doc.metadata.name !== options.serviceName) {
        throw new Errors.ValidationError(`Service name in YAML (${doc.metadata.name}) doesn't match endpoint path (${options.serviceName})`)
      }

      // For updates, we only need the spec and tags fields
      return {
        name: lget(doc, 'metadata.name', undefined),
        tags: lget(doc, 'metadata.tags', []),
        type: doc.spec.type,
        resource: doc.spec.resource,
        targetPort: doc.spec.targetPort,
        defaultBridge: doc.spec.defaultBridge,
        servicePort: doc.spec.servicePort,
        k8sType: doc.spec.k8sType
      }
    }

    // For creates, return full object
    return {
      name: lget(doc, 'metadata.name', undefined),
      tags: lget(doc, 'metadata.tags', []),
      type: doc.spec.type,
      resource: doc.spec.resource,
      targetPort: doc.spec.targetPort,
      defaultBridge: doc.spec.defaultBridge,
      servicePort: doc.spec.servicePort,
      k8sType: doc.spec.k8sType
    }
  } catch (error) {
    if (error instanceof Errors.ValidationError) {
      throw error
    }
    throw new Errors.ValidationError(`Error parsing YAML: ${error.message}`)
  }
}

const mapImages = (images) => {
  const imgs = []
  if (images.x86 != null) {
    imgs.push({
      fogTypeId: 1,
      containerImage: images.x86
    })
  }
  if (images.arm != null) {
    imgs.push({
      fogTypeId: 2,
      containerImage: images.arm
    })
  }
  return imgs
}

const parseMicroserviceImages = async (fileImages) => {
  // Could be undefined if patch call
  if (!fileImages) {
    return { registryId: undefined, images: undefined, catalogItemId: undefined }
  }
  if (fileImages.catalogId > 0) {
    return { registryId: undefined, images: undefined, catalogItemId: fileImages.catalogId }
  }
  const registryByName = {
    remote: 1,
    local: 2
  }
  const images = mapImages(fileImages)
  const registryId = fileImages.registry != null ? registryByName[fileImages.registry] || Number(fileImages.registry) : 1
  return { registryId, catalogItemId: undefined, images }
}

const parseMicroserviceYAML = async (microservice) => {
  const { registryId, catalogItemId, images } = await parseMicroserviceImages(microservice.images)
  const container = microservice.container || {}

  // Parse environment variables with support for value, valueFromSecret, and valueFromConfigMap
  const parseEnvVariables = (envArray) => {
    if (!envArray || !Array.isArray(envArray)) {
      return []
    }

    return envArray.map(env => {
      if (!env || typeof env !== 'object') {
        throw new Errors.ValidationError('Invalid environment variable format')
      }

      if (!env.key) {
        throw new Errors.ValidationError('Environment variable must have a key')
      }

      const envVar = {
        key: env.key.toString()
      }

      // Check that exactly one of value, valueFromSecret, or valueFromConfigMap is provided
      const hasValue = env.hasOwnProperty('value')
      const hasValueFromSecret = env.hasOwnProperty('valueFromSecret')
      const hasValueFromConfigMap = env.hasOwnProperty('valueFromConfigMap')

      const valueCount = [hasValue, hasValueFromSecret, hasValueFromConfigMap].filter(Boolean).length

      if (valueCount === 0) {
        throw new Errors.ValidationError(`Environment variable '${env.key}' must have either value, valueFromSecret, or valueFromConfigMap`)
      }

      if (valueCount > 1) {
        throw new Errors.ValidationError(`Environment variable '${env.key}' can only have one of: value, valueFromSecret, or valueFromConfigMap`)
      }

      // Handle simple value
      if (hasValue) {
        envVar.value = env.value.toString()
      }

      // Handle valueFromSecret
      if (hasValueFromSecret) {
        if (typeof env.valueFromSecret !== 'string') {
          throw new Errors.ValidationError(`valueFromSecret for environment variable '${env.key}' must be a string`)
        }
        const parts = env.valueFromSecret.split('/')
        if (parts.length !== 2 || !parts[0] || !parts[1]) {
          throw new Errors.ValidationError(`valueFromSecret for environment variable '${env.key}' must be in format 'secret-name/key'`)
        }
        envVar.valueFromSecret = env.valueFromSecret
      }

      // Handle valueFromConfigMap
      if (hasValueFromConfigMap) {
        if (typeof env.valueFromConfigMap !== 'string') {
          throw new Errors.ValidationError(`valueFromConfigMap for environment variable '${env.key}' must be a string`)
        }
        const parts = env.valueFromConfigMap.split('/')
        if (parts.length !== 2 || !parts[0] || !parts[1]) {
          throw new Errors.ValidationError(`valueFromConfigMap for environment variable '${env.key}' must be in format 'configmap-name/key'`)
        }
        envVar.valueFromConfigMap = env.valueFromConfigMap
      }

      return envVar
    })
  }

  const microserviceData = {
    config: microservice.config != null ? JSON.stringify(microservice.config) : undefined,
    name: microservice.name,
    catalogItemId,
    agentName: lget(microservice, 'agent.name'),
    registryId,
    ...container,
    hostNetworkMode: lget(microservice, 'container.hostNetworkMode', false),
    isPrivileged: lget(microservice, 'container.isPrivileged', false),
    pidMode: lget(microservice, 'container.pidMode', ''),
    ipcMode: lget(microservice, 'container.ipcMode', ''),
    cpuSetCpus: lget(microservice, 'container.cpuSetCpus', ''),
    memoryLimit: lget(microservice, 'container.memoryLimit', undefined),
    healthCheck: lget(microservice, 'container.healthCheck', {}),
    annotations: container.annotations != null ? JSON.stringify(container.annotations) : undefined,
    capAdd: lget(microservice, 'container.capAdd', []),
    capDrop: lget(microservice, 'container.capDrop', []),
    ports: (lget(microservice, 'container.ports', [])),
    volumeMappings: lget(microservice, 'container.volumes', []),
    cmd: lget(microservice, 'container.commands', []),
    env: parseEnvVariables(lget(microservice, 'container.env', [])),
    images,
    extraHosts: lget(microservice, 'container.extraHosts', []),
    application: microservice.application,
    schedule: lget(microservice, 'schedule', 50),
    serviceAccount: lget(microservice, 'serviceAccount', undefined),
    natsEnabled: lget(microservice, 'natsEnabled', undefined),
    natsConfig: lget(microservice, 'natsConfig', undefined)
  }
  _deleteUndefinedFields(microserviceData)
  return microserviceData
}

async function parseMicroserviceFile (fileContent) {
  const doc = yaml.load(fileContent)
  if (doc.kind !== 'Microservice') {
    throw new Errors.ValidationError(`Invalid kind ${doc.kind}`)
  }
  if (doc.metadata == null || doc.spec == null) {
    throw new Errors.ValidationError('Invalid YAML format')
  }
  const microservice = {
    name: lget(doc, 'metadata.name', undefined),
    ...(await parseMicroserviceYAML(doc.spec))
  }
  // Name could be FQName: <app_name>/<msvc_name>
  if (microservice.name) {
    const splittedName = microservice.name.split('/')
    switch (splittedName.length) {
      case 1: {
        microservice.name = splittedName[0]
        break
      }
      case 2: {
        microservice.name = splittedName[1]
        microservice.application = splittedName[0]
        break
      }
      default: {
        throw new Errors.ValidationError(`Invalid name ${microservice.name}`)
      }
    }
  }
  return microservice
}

const _deleteUndefinedFields = (obj) => Object.keys(obj).forEach(key => obj[key] === undefined && delete obj[key])

async function parseRoleFile (fileContent) {
  try {
    const doc = yaml.load(fileContent)
    if (doc.kind !== 'Role') {
      throw new Errors.ValidationError(`Invalid kind ${doc.kind}, expected Role`)
    }
    if (doc.metadata == null) {
      throw new Errors.ValidationError('Invalid YAML format: metadata is required')
    }
    return {
      name: doc.metadata.name,
      kind: doc.kind,
      // apiVersion removed - not stored in database
      // namespace removed - not stored in database (controller manages single namespace)
      rules: doc.rules || []
    }
  } catch (error) {
    if (error instanceof Errors.ValidationError) {
      throw error
    }
    throw new Errors.ValidationError(`Error parsing Role YAML: ${error.message}`)
  }
}

async function parseRoleBindingFile (fileContent) {
  try {
    const doc = yaml.load(fileContent)
    if (doc.kind !== 'RoleBinding') {
      throw new Errors.ValidationError(`Invalid kind ${doc.kind}, expected RoleBinding`)
    }
    if (doc.metadata == null || doc.roleRef == null) {
      throw new Errors.ValidationError('Invalid YAML format: metadata and roleRef are required')
    }
    return {
      name: doc.metadata.name,
      kind: doc.kind,
      // apiVersion removed - not stored in database
      // namespace removed - not stored in database (controller manages single namespace)
      roleRef: doc.roleRef,
      subjects: doc.subjects || []
    }
  } catch (error) {
    if (error instanceof Errors.ValidationError) {
      throw error
    }
    throw new Errors.ValidationError(`Error parsing RoleBinding YAML: ${error.message}`)
  }
}

async function parseServiceAccountFile (fileContent) {
  try {
    const doc = yaml.load(fileContent)
    if (doc.kind !== 'ServiceAccount') {
      throw new Errors.ValidationError(`Invalid kind ${doc.kind}, expected ServiceAccount`)
    }
    if (doc.metadata == null) {
      throw new Errors.ValidationError('Invalid YAML format: metadata is required')
    }
    if (!doc.metadata.applicationName) {
      throw new Errors.ValidationError('ServiceAccount YAML must have metadata.applicationName')
    }
    if (!doc.roleRef || !doc.roleRef.name) {
      throw new Errors.ValidationError('ServiceAccount must have a roleRef with a name')
    }
    return {
      name: doc.metadata.name,
      applicationName: doc.metadata.applicationName,
      roleRef: doc.roleRef
    }
  } catch (error) {
    if (error instanceof Errors.ValidationError) {
      throw error
    }
    throw new Errors.ValidationError(`Error parsing ServiceAccount YAML: ${error.message}`)
  }
}

async function parseCertificateFile (fileContent) {
  try {
    const doc = yaml.load(fileContent)
    if (!doc || !doc.kind) {
      throw new Errors.ValidationError(`Invalid YAML format: missing kind field`)
    }
    if (doc.kind !== 'Certificate' && doc.kind !== 'CertificateAuthority') {
      throw new Errors.ValidationError(`Invalid kind ${doc.kind}`)
    }
    if (doc.metadata == null || doc.spec == null) {
      throw new Errors.ValidationError('Invalid YAML format: missing metadata or spec')
    }

    const result = {
      name: lget(doc, 'metadata.name', undefined),
      ...doc.spec
    }

    if (doc.kind === 'CertificateAuthority') {
      result.isCA = true
    }

    return result
  } catch (error) {
    if (error instanceof Errors.ValidationError) {
      throw error
    }
    throw new Errors.ValidationError(`Error parsing YAML: ${error.message}`)
  }
}

function _pickDefined (obj) {
  const out = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v
  }
  return out
}

function _natsAccountRuleSpecToModel (spec) {
  if (!spec || typeof spec !== 'object') {
    return {}
  }
  const limits = spec.limits || {}
  const defaultPerms = spec.default_permissions || {}
  const pub = defaultPerms.pub || {}
  const sub = defaultPerms.sub || {}
  const resp = defaultPerms.resp || {}
  const raw = {
    description: spec.description,
    infoUrl: spec.info_url !== undefined ? spec.info_url : spec.infoUrl,
    maxConnections: spec.maxConnections != null ? spec.maxConnections : limits.conn,
    maxLeafNodeConnections: spec.maxLeafNodeConnections != null ? spec.maxLeafNodeConnections : limits.leaf,
    maxData: spec.maxData != null ? spec.maxData : limits.data,
    maxExports: spec.maxExports != null ? spec.maxExports : limits.exports,
    maxImports: spec.maxImports != null ? spec.maxImports : limits.imports,
    maxMsgPayload: spec.maxMsgPayload != null ? spec.maxMsgPayload : limits.payload,
    maxSubscriptions: spec.maxSubscriptions != null ? spec.maxSubscriptions : limits.subs,
    exportsAllowWildcards: spec.exportsAllowWildcards != null ? spec.exportsAllowWildcards : limits.wildcards,
    disallowBearer: spec.disallowBearer != null ? spec.disallowBearer : limits.disallow_bearer,
    respMax: spec.respMax != null ? spec.respMax : resp.max,
    respTtl: spec.respTtl != null ? spec.respTtl : resp.ttl,
    imports: Array.isArray(spec.imports) ? spec.imports : undefined,
    exports: Array.isArray(spec.exports) ? spec.exports : undefined,
    memStorage: spec.memStorage != null ? spec.memStorage : limits.mem_storage,
    diskStorage: spec.diskStorage != null ? spec.diskStorage : limits.disk_storage,
    streams: spec.streams != null ? spec.streams : limits.streams,
    consumer: spec.consumer != null ? spec.consumer : limits.consumer,
    maxAckPending: spec.maxAckPending != null ? spec.maxAckPending : limits.max_ack_pending,
    memMaxStreamBytes: spec.memMaxStreamBytes != null ? spec.memMaxStreamBytes : limits.mem_max_stream_bytes,
    diskMaxStreamBytes: spec.diskMaxStreamBytes != null ? spec.diskMaxStreamBytes : limits.disk_max_stream_bytes,
    maxBytesRequired: spec.maxBytesRequired != null ? spec.maxBytesRequired : limits.max_bytes_required,
    tieredLimits: typeof spec.tieredLimits === 'object' ? spec.tieredLimits : (spec.tiered_limits && typeof spec.tiered_limits === 'object' ? spec.tiered_limits : undefined),
    pubAllow: Array.isArray(spec.pubAllow) ? spec.pubAllow : (Array.isArray(pub.allow) ? pub.allow : undefined),
    pubDeny: Array.isArray(spec.pubDeny) ? spec.pubDeny : (Array.isArray(pub.deny) ? pub.deny : undefined),
    subAllow: Array.isArray(spec.subAllow) ? spec.subAllow : (Array.isArray(sub.allow) ? sub.allow : undefined),
    subDeny: Array.isArray(spec.subDeny) ? spec.subDeny : (Array.isArray(sub.deny) ? sub.deny : undefined)
  }
  return _pickDefined(raw)
}

function _natsUserRuleSpecToModel (spec) {
  if (!spec || typeof spec !== 'object') {
    return {}
  }
  const pub = spec.pub || {}
  const sub = spec.sub || {}
  const resp = spec.resp || {}
  const raw = {
    description: spec.description,
    maxSubscriptions: spec.maxSubscriptions != null ? spec.maxSubscriptions : spec.subs,
    maxPayload: spec.maxPayload != null ? spec.maxPayload : spec.payload,
    maxData: spec.maxData,
    bearerToken: spec.bearerToken != null ? spec.bearerToken : spec.bearer_token,
    proxyRequired: spec.proxyRequired != null ? spec.proxyRequired : spec.proxy_required,
    allowedConnectionTypes: Array.isArray(spec.allowedConnectionTypes) ? spec.allowedConnectionTypes : (Array.isArray(spec.allowed_connection_types) ? spec.allowed_connection_types : undefined),
    src: Array.isArray(spec.src) ? spec.src : undefined,
    times: Array.isArray(spec.times) ? spec.times : undefined,
    timesLocation: spec.timesLocation != null ? spec.timesLocation : (spec.times_location != null ? spec.times_location : spec.locale),
    respMax: spec.respMax != null ? spec.respMax : resp.max,
    respTtl: spec.respTtl != null ? spec.respTtl : resp.ttl,
    pubAllow: Array.isArray(spec.pubAllow) ? spec.pubAllow : (Array.isArray(pub.allow) ? pub.allow : undefined),
    pubDeny: Array.isArray(spec.pubDeny) ? spec.pubDeny : (Array.isArray(pub.deny) ? pub.deny : undefined),
    subAllow: Array.isArray(spec.subAllow) ? spec.subAllow : (Array.isArray(sub.allow) ? sub.allow : undefined),
    subDeny: Array.isArray(spec.subDeny) ? spec.subDeny : (Array.isArray(sub.deny) ? sub.deny : undefined),
    tags: Array.isArray(spec.tags) ? spec.tags : undefined
  }
  return _pickDefined(raw)
}

async function parseNatsAccountRuleFile (fileContent, options = {}) {
  try {
    const doc = yaml.load(fileContent)
    if (!doc || doc.kind !== 'NatsAccountRule') {
      throw new Errors.ValidationError(`Invalid kind ${doc && doc.kind}, expected NatsAccountRule`)
    }
    if (doc.metadata == null || doc.spec == null) {
      throw new Errors.ValidationError('Invalid YAML format: metadata and spec are required')
    }
    if (options.isUpdate && options.ruleName && doc.metadata.name !== options.ruleName) {
      throw new Errors.ValidationError(`Rule name in YAML (${doc.metadata.name}) doesn't match endpoint path (${options.ruleName})`)
    }
    const modelFields = _natsAccountRuleSpecToModel(doc.spec)
    const result = {
      name: doc.metadata.name,
      ...doc.spec,
      ...modelFields
    }
    delete result.jetstreamEnabled
    delete result.jetstream
    delete result.limits
    delete result.default_permissions
    delete result.info_url
    delete result.tiered_limits
    return result
  } catch (error) {
    if (error instanceof Errors.ValidationError) {
      throw error
    }
    throw new Errors.ValidationError(`Error parsing NATS account rule YAML: ${error.message}`)
  }
}

async function parseNatsUserRuleFile (fileContent, options = {}) {
  try {
    const doc = yaml.load(fileContent)
    if (!doc || doc.kind !== 'NatsUserRule') {
      throw new Errors.ValidationError(`Invalid kind ${doc && doc.kind}, expected NatsUserRule`)
    }
    if (doc.metadata == null || doc.spec == null) {
      throw new Errors.ValidationError('Invalid YAML format: metadata and spec are required')
    }
    if (options.isUpdate && options.ruleName && doc.metadata.name !== options.ruleName) {
      throw new Errors.ValidationError(`Rule name in YAML (${doc.metadata.name}) doesn't match endpoint path (${options.ruleName})`)
    }
    const modelFields = _natsUserRuleSpecToModel(doc.spec)
    const result = {
      name: doc.metadata.name,
      ...doc.spec,
      ...modelFields
    }
    delete result.pub
    delete result.sub
    delete result.resp
    delete result.allowed_connection_types
    delete result.bearer_token
    delete result.proxy_required
    delete result.times_location
    delete result.subs
    delete result.payload
    return result
  } catch (error) {
    if (error instanceof Errors.ValidationError) {
      throw error
    }
    throw new Errors.ValidationError(`Error parsing NATS user rule YAML: ${error.message}`)
  }
}

module.exports = {
  parseAppTemplateFile: parseAppTemplateFile,
  parseAppFile: parseAppFile,
  parseMicroserviceFile: parseMicroserviceFile,
  parseSecretFile: parseSecretFile,
  parseVolumeMountFile: parseVolumeMountFile,
  parseConfigMapFile: parseConfigMapFile,
  parseCertificateFile: parseCertificateFile,
  parseNatsAccountRuleFile: parseNatsAccountRuleFile,
  parseNatsUserRuleFile: parseNatsUserRuleFile,
  parseServiceFile: parseServiceFile,
  parseRoleFile: parseRoleFile,
  parseRoleBindingFile: parseRoleBindingFile,
  parseServiceAccountFile: parseServiceAccountFile
}
