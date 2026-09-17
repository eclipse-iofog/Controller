const Errors = require('../helpers/errors')
const CatalogContainer = require('../helpers/microservice-container-catalog')
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
      throw new Errors.ValidationError('Invalid YAML format: missing kind field')
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
      throw new Errors.ValidationError('Invalid YAML format: missing kind field')
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
      throw new Errors.ValidationError('Invalid YAML format: missing kind field')
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
      throw new Errors.ValidationError('Invalid YAML format: missing kind field')
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

const { mapYamlImagesToArchList } = require('../helpers/arch-images')

const mapImages = (images) => mapYamlImagesToArchList(images)

const REGISTRY_BY_NAME = {
  remote: 1,
  local: 2
}

function isTemplatePlaceholder (value) {
  return typeof value === 'string' && value.includes('{{')
}

function asIdOrPlaceholder (value, registryByName = REGISTRY_BY_NAME) {
  if (value == null || value === '') {
    return undefined
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (isTemplatePlaceholder(trimmed)) {
      return trimmed
    }
    if (Object.hasOwn(registryByName, trimmed)) {
      return registryByName[trimmed]
    }
    const asNumber = Number(trimmed)
    if (trimmed !== '' && Number.isFinite(asNumber) && String(asNumber) === trimmed) {
      return asNumber
    }
    return trimmed
  }
  const asNumber = Number(value)
  if (Number.isFinite(asNumber)) {
    return asNumber
  }
  return value
}

const parseMicroserviceImages = async (fileImages, options = {}) => {
  const { templateMode = false } = options
  // Could be undefined if patch call
  if (!fileImages) {
    return { registryId: undefined, images: undefined, catalogItemId: undefined }
  }
  if (fileImages.catalogId != null && fileImages.catalogId !== '') {
    const catalogItemId = asIdOrPlaceholder(fileImages.catalogId)
    if (templateMode && typeof catalogItemId === 'string') {
      return { registryId: undefined, images: undefined, catalogItemId }
    }
    if (typeof catalogItemId === 'number' && catalogItemId > 0) {
      return { registryId: undefined, images: undefined, catalogItemId }
    }
  }
  const images = mapImages(fileImages)
  let registryId
  if (fileImages.registry != null && fileImages.registry !== '') {
    registryId = asIdOrPlaceholder(fileImages.registry)
  } else if (!templateMode) {
    registryId = 1
  }
  return { registryId, catalogItemId: undefined, images }
}

function parseEnvVariables (envArray) {
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

    const hasValue = Object.hasOwn(env, 'value')
    const hasValueFromSecret = Object.hasOwn(env, 'valueFromSecret')
    const hasValueFromConfigMap = Object.hasOwn(env, 'valueFromConfigMap')

    const valueCount = [hasValue, hasValueFromSecret, hasValueFromConfigMap].filter(Boolean).length

    if (valueCount === 0) {
      throw new Errors.ValidationError(`Environment variable '${env.key}' must have either value, valueFromSecret, or valueFromConfigMap`)
    }

    if (valueCount > 1) {
      throw new Errors.ValidationError(`Environment variable '${env.key}' can only have one of: value, valueFromSecret, or valueFromConfigMap`)
    }

    if (hasValue) {
      envVar.value = env.value.toString()
    }

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

function parseMicroserviceTemplateRef (template) {
  if (template == null) {
    return undefined
  }
  if (typeof template !== 'object' || Array.isArray(template)) {
    throw new Errors.ValidationError('Invalid template format')
  }
  if (!template.name) {
    throw new Errors.ValidationError('template.name is required when template is specified')
  }
  const result = { name: template.name }
  if (template.variables !== undefined) {
    result.variables = template.variables
  }
  return result
}

const parseMicroserviceYAML = async (microservice) => {
  const { registryId, catalogItemId, images } = await parseMicroserviceImages(microservice.images)
  const container = microservice.container || {}

  const commands = container.commands !== undefined ? container.commands : container.cmd
  const sysctls = container.sysctls !== undefined
    ? CatalogContainer.normalizeSysctls(container.sysctls)
    : undefined

  const microserviceData = {
    config: microservice.config != null ? JSON.stringify(microservice.config) : undefined,
    name: microservice.name,
    catalogItemId,
    agentName: lget(microservice, 'agent.name'),
    registryId,
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
    commands,
    cmd: commands,
    env: parseEnvVariables(lget(microservice, 'container.env', [])),
    images,
    extraHosts: lget(microservice, 'container.extraHosts', []),
    application: microservice.application,
    models: microservice.models,
    template: parseMicroserviceTemplateRef(microservice.template),
    schedule: lget(microservice, 'schedule', 50),
    serviceAccount: lget(microservice, 'serviceAccount', undefined),
    natsEnabled: lget(microservice, 'natsEnabled', undefined),
    natsConfig: lget(microservice, 'natsConfig', undefined),
    runAsUser: lget(microservice, 'container.runAsUser', undefined),
    runAsGroup: lget(microservice, 'container.runAsGroup', undefined),
    readOnlyRootFilesystem: lget(microservice, 'container.readOnlyRootFilesystem', undefined),
    platform: lget(microservice, 'container.platform', undefined),
    runtime: lget(microservice, 'container.runtime', undefined),
    cdiDevices: lget(microservice, 'container.cdiDevices', undefined),
    sysctls,
    ulimits: lget(microservice, 'container.ulimits', undefined),
    cpus: lget(microservice, 'container.cpus', undefined),
    memoryReservation: lget(microservice, 'container.memoryReservation', undefined),
    memorySwap: lget(microservice, 'container.memorySwap', undefined),
    shmSize: lget(microservice, 'container.shmSize', undefined),
    devices: lget(microservice, 'container.devices', undefined),
    tmpfs: lget(microservice, 'container.tmpfs', undefined),
    workingDir: lget(microservice, 'container.workingDir', undefined),
    entrypoint: lget(microservice, 'container.entrypoint', undefined)
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
      throw new Errors.ValidationError('Invalid YAML format: missing kind field')
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

async function parseModelFile (fileContent, options = {}) {
  try {
    const doc = yaml.load(fileContent)
    if (!doc || !doc.kind) {
      throw new Errors.ValidationError('Invalid YAML format: missing kind field')
    }
    if (doc.kind !== 'Model') {
      throw new Errors.ValidationError(`Invalid kind ${doc.kind}`)
    }
    if (doc.metadata == null || doc.spec == null) {
      throw new Errors.ValidationError('Invalid YAML format: missing metadata or spec')
    }

    const allowedApiVersions = new Set(['iofog.org/v3', 'datasance.com/v3'])
    if (doc.apiVersion && !allowedApiVersions.has(doc.apiVersion)) {
      throw new Errors.ValidationError(`Invalid apiVersion ${doc.apiVersion}`)
    }

    if (options.isUpdate && options.modelName) {
      if (doc.metadata.name !== options.modelName) {
        throw new Errors.ValidationError(`Model name in YAML (${doc.metadata.name}) doesn't match endpoint path (${options.modelName})`)
      }
    }

    const spec = doc.spec || {}
    const registryId = spec.registryId != null ? spec.registryId : spec.registry
    const result = {
      name: lget(doc, 'metadata.name', undefined),
      repo: spec.repo,
      revision: spec.revision,
      registryId,
      files: spec.files,
      format: spec.format
    }
    _deleteUndefinedFields(result)

    if (options.isUpdate && options.modelName) {
      delete result.name
    }

    return result
  } catch (error) {
    if (error instanceof Errors.ValidationError) {
      throw error
    }
    throw new Errors.ValidationError(`Error parsing YAML: ${error.message}`)
  }
}

async function parseRuntimeClassFile (fileContent, options = {}) {
  try {
    const doc = yaml.load(fileContent)
    if (!doc || !doc.kind) {
      throw new Errors.ValidationError('Invalid YAML format: missing kind field')
    }
    if (doc.kind !== 'RuntimeClass') {
      throw new Errors.ValidationError(`Invalid kind ${doc.kind}`)
    }
    if (doc.metadata == null) {
      throw new Errors.ValidationError('Invalid YAML format: missing metadata')
    }

    const allowedApiVersions = new Set(['iofog.org/v3', 'datasance.com/v3'])
    if (doc.apiVersion && !allowedApiVersions.has(doc.apiVersion)) {
      throw new Errors.ValidationError(`Invalid apiVersion ${doc.apiVersion}`)
    }

    if (options.isUpdate && options.runtimeClassName) {
      if (doc.metadata.name !== options.runtimeClassName) {
        throw new Errors.ValidationError(`RuntimeClass name in YAML (${doc.metadata.name}) doesn't match endpoint path (${options.runtimeClassName})`)
      }
    }

    const handler = doc.handler != null && doc.handler !== ''
      ? doc.handler
      : lget(doc, 'spec.handler', undefined)
    if (handler == null || handler === '') {
      throw new Errors.ValidationError('Invalid YAML format: handler is required')
    }

    const result = {
      name: lget(doc, 'metadata.name', undefined),
      handler
    }
    _deleteUndefinedFields(result)

    if (options.isUpdate && options.runtimeClassName) {
      delete result.name
    }

    return result
  } catch (error) {
    if (error instanceof Errors.ValidationError) {
      throw error
    }
    throw new Errors.ValidationError(`Error parsing YAML: ${error.message}`)
  }
}

function setContainerFieldIfPresent (data, container, dataKey, containerKey, transform) {
  if (!Object.hasOwn(container, containerKey)) {
    return
  }
  data[dataKey] = transform ? transform(container[containerKey]) : container[containerKey]
}

async function parseMicroserviceTemplateYAML (microservice) {
  const { registryId, catalogItemId, images } = await parseMicroserviceImages(microservice.images, { templateMode: true })
  const container = microservice.container || {}
  const microserviceData = {}

  if (microservice.config != null) {
    microserviceData.config = JSON.stringify(microservice.config)
  }
  if (microservice.application !== undefined) {
    microserviceData.application = microservice.application
  }
  if (lget(microservice, 'agent.name') !== undefined) {
    microserviceData.agentName = lget(microservice, 'agent.name')
  }
  if (catalogItemId !== undefined) {
    microserviceData.catalogItemId = catalogItemId
  }
  if (registryId !== undefined) {
    microserviceData.registryId = registryId
  }
  if (images && images.length > 0) {
    microserviceData.images = images
  }
  if (microservice.models !== undefined) {
    microserviceData.models = microservice.models
  }
  if (microservice.schedule !== undefined) {
    microserviceData.schedule = microservice.schedule
  }
  if (microservice.serviceAccount !== undefined) {
    microserviceData.serviceAccount = microservice.serviceAccount
  }
  if (microservice.natsEnabled !== undefined) {
    microserviceData.natsEnabled = microservice.natsEnabled
  }
  if (microservice.natsConfig !== undefined) {
    microserviceData.natsConfig = microservice.natsConfig
  }

  setContainerFieldIfPresent(microserviceData, container, 'hostNetworkMode', 'hostNetworkMode')
  setContainerFieldIfPresent(microserviceData, container, 'isPrivileged', 'isPrivileged')
  setContainerFieldIfPresent(microserviceData, container, 'pidMode', 'pidMode')
  setContainerFieldIfPresent(microserviceData, container, 'ipcMode', 'ipcMode')
  setContainerFieldIfPresent(microserviceData, container, 'cpuSetCpus', 'cpuSetCpus')
  setContainerFieldIfPresent(microserviceData, container, 'memoryLimit', 'memoryLimit')
  setContainerFieldIfPresent(microserviceData, container, 'runAsUser', 'runAsUser')
  setContainerFieldIfPresent(microserviceData, container, 'runAsGroup', 'runAsGroup')
  setContainerFieldIfPresent(microserviceData, container, 'readOnlyRootFilesystem', 'readOnlyRootFilesystem')
  setContainerFieldIfPresent(microserviceData, container, 'platform', 'platform')
  setContainerFieldIfPresent(microserviceData, container, 'runtime', 'runtime')
  setContainerFieldIfPresent(microserviceData, container, 'cdiDevices', 'cdiDevices')
  setContainerFieldIfPresent(microserviceData, container, 'cpus', 'cpus')
  setContainerFieldIfPresent(microserviceData, container, 'memoryReservation', 'memoryReservation')
  setContainerFieldIfPresent(microserviceData, container, 'memorySwap', 'memorySwap')
  setContainerFieldIfPresent(microserviceData, container, 'shmSize', 'shmSize')
  setContainerFieldIfPresent(microserviceData, container, 'workingDir', 'workingDir')
  setContainerFieldIfPresent(microserviceData, container, 'entrypoint', 'entrypoint')
  setContainerFieldIfPresent(microserviceData, container, 'ulimits', 'ulimits')
  setContainerFieldIfPresent(microserviceData, container, 'devices', 'devices')
  setContainerFieldIfPresent(microserviceData, container, 'tmpfs', 'tmpfs')
  setContainerFieldIfPresent(microserviceData, container, 'capAdd', 'capAdd')
  setContainerFieldIfPresent(microserviceData, container, 'capDrop', 'capDrop')
  setContainerFieldIfPresent(microserviceData, container, 'ports', 'ports')
  setContainerFieldIfPresent(microserviceData, container, 'volumes', 'volumeMappings')
  setContainerFieldIfPresent(microserviceData, container, 'extraHosts', 'extraHosts')
  setContainerFieldIfPresent(microserviceData, container, 'healthCheck', 'healthCheck')
  if (container.annotations != null) {
    microserviceData.annotations = JSON.stringify(container.annotations)
  }
  if (container.sysctls !== undefined) {
    microserviceData.sysctls = CatalogContainer.normalizeSysctls(container.sysctls)
  }
  if (Object.hasOwn(container, 'commands') || Object.hasOwn(container, 'cmd')) {
    microserviceData.commands = container.commands !== undefined ? container.commands : container.cmd
  }
  if (Object.hasOwn(container, 'env')) {
    microserviceData.env = parseEnvVariables(container.env)
  }

  _deleteUndefinedFields(microserviceData)
  return microserviceData
}

async function parseMicroserviceTemplateFile (fileContent, options = {}) {
  try {
    const doc = yaml.load(fileContent)
    if (!doc || !doc.kind) {
      throw new Errors.ValidationError('Invalid YAML format: missing kind field')
    }
    if (doc.kind !== 'MicroserviceTemplate') {
      throw new Errors.ValidationError(`Invalid kind ${doc.kind}`)
    }
    if (doc.metadata == null || doc.spec == null) {
      throw new Errors.ValidationError('Invalid YAML format: missing metadata or spec')
    }

    const allowedApiVersions = new Set(['iofog.org/v3', 'datasance.com/v3'])
    if (doc.apiVersion && !allowedApiVersions.has(doc.apiVersion)) {
      throw new Errors.ValidationError(`Invalid apiVersion ${doc.apiVersion}`)
    }

    if (options.isUpdate && options.templateName) {
      if (doc.metadata.name !== options.templateName) {
        throw new Errors.ValidationError(`MicroserviceTemplate name in YAML (${doc.metadata.name}) doesn't match endpoint path (${options.templateName})`)
      }
    }

    const spec = doc.spec || {}
    if (!spec.microservice || typeof spec.microservice !== 'object' || Array.isArray(spec.microservice)) {
      throw new Errors.ValidationError('MicroserviceTemplate spec.microservice is required')
    }

    const microservice = await parseMicroserviceTemplateYAML(spec.microservice)
    delete microservice.name
    delete microservice.iofogUuid
    delete microservice.flowId
    delete microservice.template

    const result = {
      name: lget(doc, 'metadata.name', undefined),
      description: spec.description,
      variables: spec.variables,
      microservice
    }
    _deleteUndefinedFields(result)

    if (options.isUpdate && options.templateName) {
      delete result.name
    }

    return result
  } catch (error) {
    if (error instanceof Errors.ValidationError) {
      throw error
    }
    throw new Errors.ValidationError(`Error parsing YAML: ${error.message}`)
  }
}

module.exports = {
  parseAppTemplateFile,
  parseAppFile,
  parseMicroserviceFile,
  parseSecretFile,
  parseVolumeMountFile,
  parseConfigMapFile,
  parseCertificateFile,
  parseNatsAccountRuleFile,
  parseNatsUserRuleFile,
  parseServiceFile,
  parseRoleFile,
  parseRoleBindingFile,
  parseServiceAccountFile,
  parseModelFile,
  parseRuntimeClassFile,
  parseMicroserviceTemplateFile
}
