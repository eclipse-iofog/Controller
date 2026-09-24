'use strict'

const Errors = require('./errors')
const ErrorMessages = require('./error-messages')
const AppHelper = require('./app-helper')
const { serviceNameRegex } = require('../schemas/utils/utils')

const SERVICE_NAME_RE = new RegExp(`^${serviceNameRegex}$`)

const SYSCTL_ALLOWLIST = new Set([
  'kernel.shm_rmid_forced',
  'net.ipv4.ip_local_port_range',
  'net.ipv4.tcp_syncookies',
  'net.ipv4.ping_group_range',
  'net.ipv4.ip_unprivileged_port_start',
  'net.ipv4.ip_local_reserved_ports',
  'net.ipv4.tcp_keepalive_time',
  'net.ipv4.tcp_fin_timeout',
  'net.ipv4.tcp_keepalive_intvl',
  'net.ipv4.tcp_keepalive_probes',
  'net.ipv4.tcp_rmem',
  'net.ipv4.tcp_wmem',
  'net.ipv4.tcp_slow_start_after_idle',
  'net.ipv4.tcp_notsent_lowat'
])

const ULIMIT_ALLOWLIST = new Set([
  'core', 'cpu', 'data', 'fsize', 'locks', 'memlock', 'msgqueue', 'nice',
  'nofile', 'nproc', 'rss', 'rtprio', 'rttime', 'sigpending', 'stack'
])

function parseJsonField (raw) {
  if (raw == null || raw === '') {
    return null
  }
  if (typeof raw === 'object') {
    return raw
  }
  if (typeof raw !== 'string') {
    return null
  }
  try {
    return JSON.parse(raw)
  } catch (error) {
    return null
  }
}

function serializeJsonField (value) {
  if (value == null) {
    return null
  }
  return JSON.stringify(value)
}

function parseArgv (raw) {
  const parsed = Array.isArray(raw) ? raw : parseJsonField(raw)
  if (!Array.isArray(parsed)) {
    return []
  }
  return parsed.filter((item) => typeof item === 'string')
}

function serializeArgv (argv) {
  if (!Array.isArray(argv) || argv.length === 0) {
    return null
  }
  return JSON.stringify(argv)
}

function resolveProcessArgv (data) {
  if (!data || typeof data !== 'object') {
    return undefined
  }
  if (data.commands !== undefined) {
    return data.commands
  }
  if (data.cmd !== undefined) {
    return data.cmd
  }
  return undefined
}

function assertArgv (name, argv) {
  if (argv === undefined || argv === null) {
    return
  }
  if (!Array.isArray(argv) || argv.some((item) => typeof item !== 'string')) {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.MICROSERVICE_ARGV_TYPE, name))
  }
}

function isCatalogEmpty (catalog) {
  return !catalog || !Array.isArray(catalog.items) || catalog.items.length === 0
}

function parseCatalog (raw) {
  return parseJsonField(raw)
}

function normalizeCatalog (input) {
  if (input == null) {
    return null
  }
  const items = Array.isArray(input.items)
    ? input.items.map((item) => ({ name: item && item.name }))
    : []
  const permissions = input.permissions == null || input.permissions === ''
    ? 'ro'
    : input.permissions
  return {
    bindPath: input.bindPath,
    permissions,
    items
  }
}

function serializeCatalog (catalog) {
  if (catalog == null) {
    return null
  }
  return JSON.stringify({
    bindPath: catalog.bindPath || '',
    permissions: catalog.permissions || 'ro',
    items: Array.isArray(catalog.items) ? catalog.items : []
  })
}

function catalogItemNames (catalog) {
  if (isCatalogEmpty(catalog)) {
    return []
  }
  return catalog.items.map((item) => item && item.name).filter(Boolean)
}

function catalogRequiresRebuild (previousRaw, nextCatalog) {
  const previous = previousRaw && typeof previousRaw === 'object' && !Array.isArray(previousRaw)
    ? previousRaw
    : parseCatalog(previousRaw)
  const previousEmpty = isCatalogEmpty(previous)
  const nextEmpty = isCatalogEmpty(nextCatalog)
  if (previousEmpty !== nextEmpty) {
    return true
  }
  if (previousEmpty && nextEmpty) {
    return false
  }
  const previousBind = (previous && previous.bindPath) || ''
  const nextBind = (nextCatalog && nextCatalog.bindPath) || ''
  const previousPermissions = (previous && previous.permissions) || 'ro'
  const nextPermissions = (nextCatalog && nextCatalog.permissions) || 'ro'
  return previousBind !== nextBind || previousPermissions !== nextPermissions
}

function isAbsoluteContainerPath (value) {
  return typeof value === 'string' && value.startsWith('/') && value.length > 1
}

function joinCatalogItemPath (bindPath, name) {
  const base = (bindPath || '').replace(/\/+$/, '')
  return `${base}/${name}/`
}

function collectMountPaths (volumeMappings, tmpfs) {
  const paths = []
  if (Array.isArray(volumeMappings)) {
    for (const mapping of volumeMappings) {
      if (mapping && mapping.containerDestination) {
        paths.push(mapping.containerDestination)
      }
    }
  }
  const tmpfsList = Array.isArray(tmpfs) ? tmpfs : parseJsonField(tmpfs)
  if (Array.isArray(tmpfsList)) {
    for (const entry of tmpfsList) {
      if (entry && entry.containerPath) {
        paths.push(entry.containerPath)
      }
    }
  }
  return paths
}

function catalogMountPaths (catalog) {
  if (isCatalogEmpty(catalog)) {
    return []
  }
  const paths = []
  if (catalog.bindPath) {
    paths.push(catalog.bindPath)
  }
  for (const item of catalog.items) {
    if (item && item.name) {
      paths.push(joinCatalogItemPath(catalog.bindPath, item.name))
    }
  }
  return paths
}

function catalogValidationMessages (kind) {
  if (kind === 'knowledge') {
    return {
      permissions: ErrorMessages.MICROSERVICE_KNOWLEDGE_PERMISSIONS,
      bindRequired: ErrorMessages.MICROSERVICE_KNOWLEDGE_BIND_PATH_REQUIRED,
      bindRequiresItems: ErrorMessages.MICROSERVICE_KNOWLEDGE_BIND_PATH_REQUIRES_ITEMS,
      bindAbsolute: ErrorMessages.MICROSERVICE_KNOWLEDGE_BIND_PATH_ABSOLUTE,
      itemName: ErrorMessages.MICROSERVICE_KNOWLEDGE_ITEM_NAME,
      duplicate: ErrorMessages.MICROSERVICE_KNOWLEDGE_DUPLICATE_ITEM,
      collision: ErrorMessages.MICROSERVICE_KNOWLEDGE_PATH_COLLISION
    }
  }
  return {
    permissions: ErrorMessages.MICROSERVICE_CATALOG_PERMISSIONS,
    bindRequired: ErrorMessages.MICROSERVICE_CATALOG_BIND_PATH_REQUIRED,
    bindRequiresItems: ErrorMessages.MICROSERVICE_CATALOG_BIND_PATH_REQUIRES_ITEMS,
    bindAbsolute: ErrorMessages.MICROSERVICE_CATALOG_BIND_PATH_ABSOLUTE,
    itemName: ErrorMessages.MICROSERVICE_CATALOG_ITEM_NAME,
    duplicate: ErrorMessages.MICROSERVICE_CATALOG_DUPLICATE_ITEM,
    collision: ErrorMessages.MICROSERVICE_CATALOG_PATH_COLLISION
  }
}

function pathsCollide (left, right) {
  if (!left || !right) {
    return false
  }
  const a = left.endsWith('/') ? left.slice(0, -1) : left
  const b = right.endsWith('/') ? right.slice(0, -1) : right
  return a === b
}

function validateCatalog (catalog, { volumeMappings, tmpfs, otherCatalog, kind } = {}) {
  if (catalog == null) {
    return
  }
  const messages = catalogValidationMessages(kind)
  if (catalog.permissions != null && catalog.permissions !== 'ro' && catalog.permissions !== 'rw') {
    throw new Errors.ValidationError(messages.permissions)
  }
  const items = Array.isArray(catalog.items) ? catalog.items : []
  if (items.length === 0) {
    if (typeof catalog.bindPath === 'string' && catalog.bindPath.trim() !== '') {
      throw new Errors.ValidationError(messages.bindRequiresItems)
    }
    return
  }
  if (!catalog.bindPath) {
    throw new Errors.ValidationError(messages.bindRequired)
  }
  if (!isAbsoluteContainerPath(catalog.bindPath) && catalog.bindPath !== '/') {
    throw new Errors.ValidationError(messages.bindAbsolute)
  }

  const seen = new Set()
  for (const item of items) {
    const name = item && item.name
    if (!name || !SERVICE_NAME_RE.test(name)) {
      throw new Errors.ValidationError(AppHelper.formatMessage(messages.itemName, name || ''))
    }
    if (seen.has(name)) {
      throw new Errors.ValidationError(AppHelper.formatMessage(messages.duplicate, name))
    }
    seen.add(name)
  }

  const mountPaths = collectMountPaths(volumeMappings, tmpfs).concat(catalogMountPaths(otherCatalog))
  const catalogPaths = [catalog.bindPath, ...items.map((item) => joinCatalogItemPath(catalog.bindPath, item.name))]
  for (const catalogPath of catalogPaths) {
    for (const mountPath of mountPaths) {
      if (pathsCollide(catalogPath, mountPath)) {
        throw new Errors.ValidationError(AppHelper.formatMessage(messages.collision, catalogPath))
      }
    }
  }
}

function pickValue (spec, existing, key) {
  if (spec && spec[key] !== undefined) {
    return spec[key]
  }
  return existing ? existing[key] : undefined
}

function assertPositiveNumber (name, value) {
  if (value == null || value === '') {
    return
  }
  if (typeof value !== 'number' || Number.isNaN(value) || value <= 0) {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.MICROSERVICE_POSITIVE_NUMBER, name))
  }
}

function isIpcSysctl (name) {
  return name.startsWith('kernel.shm') ||
    name.startsWith('kernel.msg') ||
    name.startsWith('kernel.sem') ||
    name.startsWith('fs.mqueue.')
}

function coerceSysctlValue (value) {
  if (typeof value === 'string') {
    return value
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }
  throw new Errors.ValidationError(ErrorMessages.MICROSERVICE_SYSCTL_SHAPE)
}

function normalizeSysctls (sysctls) {
  if (sysctls == null || sysctls === '') {
    return sysctls
  }
  if (typeof sysctls !== 'object' || Array.isArray(sysctls)) {
    throw new Errors.ValidationError(ErrorMessages.MICROSERVICE_SYSCTL_SHAPE)
  }
  const normalized = {}
  for (const [key, value] of Object.entries(sysctls)) {
    normalized[key] = coerceSysctlValue(value)
  }
  return normalized
}

function validateSysctls (sysctls, hostNetworkMode, ipcMode) {
  if (sysctls == null || sysctls === '') {
    return
  }
  if (typeof sysctls !== 'object' || Array.isArray(sysctls)) {
    throw new Errors.ValidationError(ErrorMessages.MICROSERVICE_SYSCTL_SHAPE)
  }
  for (const key of Object.keys(sysctls)) {
    if (!SYSCTL_ALLOWLIST.has(key)) {
      throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.MICROSERVICE_SYSCTL_UNKNOWN, key))
    }
    if (hostNetworkMode === true && key.startsWith('net.')) {
      throw new Errors.ValidationError(ErrorMessages.MICROSERVICE_SYSCTL_HOST_NETWORK)
    }
    if (ipcMode === 'host' && isIpcSysctl(key)) {
      throw new Errors.ValidationError(ErrorMessages.MICROSERVICE_SYSCTL_HOST_IPC)
    }
    coerceSysctlValue(sysctls[key])
  }
}

function validateUlimits (ulimits) {
  if (ulimits == null || ulimits === '') {
    return
  }
  if (typeof ulimits !== 'object' || Array.isArray(ulimits)) {
    throw new Errors.ValidationError(ErrorMessages.MICROSERVICE_ULIMIT_SHAPE_ROOT)
  }
  for (const [name, value] of Object.entries(ulimits)) {
    if (!ULIMIT_ALLOWLIST.has(name)) {
      throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.MICROSERVICE_ULIMIT_UNKNOWN, name))
    }
    if (!value || typeof value !== 'object' || Array.isArray(value) ||
        !Object.prototype.hasOwnProperty.call(value, 'soft') ||
        !Object.prototype.hasOwnProperty.call(value, 'hard')) {
      throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.MICROSERVICE_ULIMIT_SHAPE, name))
    }
    const soft = value.soft
    const hard = value.hard
    if (typeof soft !== 'number' || typeof hard !== 'number') {
      throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.MICROSERVICE_ULIMIT_SHAPE, name))
    }
    if (soft === -1 && hard !== -1) {
      throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.MICROSERVICE_ULIMIT_RANGE, name))
    }
    if (soft !== -1 && hard !== -1 && soft > hard) {
      throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.MICROSERVICE_ULIMIT_RANGE, name))
    }
  }
}

function normalizeDevicePermissions (permissions) {
  if (permissions == null || permissions === '') {
    return 'rwm'
  }
  if (typeof permissions !== 'string' || !/^[rwm]+$/.test(permissions)) {
    throw new Errors.ValidationError(ErrorMessages.MICROSERVICE_DEVICE_PERMISSIONS)
  }
  return permissions
}

function validateDevices (devices) {
  if (devices == null || devices === '') {
    return
  }
  if (!Array.isArray(devices)) {
    throw new Errors.ValidationError(ErrorMessages.MICROSERVICE_DEVICES_SHAPE)
  }
  for (const device of devices) {
    if (!device || typeof device !== 'object') {
      throw new Errors.ValidationError(ErrorMessages.MICROSERVICE_DEVICES_SHAPE)
    }
    if (typeof device.hostPath !== 'string' || !device.hostPath.startsWith('/dev/')) {
      throw new Errors.ValidationError(ErrorMessages.MICROSERVICE_DEVICE_HOST_PATH)
    }
    if (typeof device.containerPath !== 'string' || device.containerPath.length === 0) {
      throw new Errors.ValidationError(ErrorMessages.MICROSERVICE_DEVICE_CONTAINER_PATH)
    }
    device.permissions = normalizeDevicePermissions(device.permissions)
  }
}

function validateTmpfs (tmpfs) {
  if (tmpfs == null || tmpfs === '') {
    return
  }
  if (!Array.isArray(tmpfs)) {
    throw new Errors.ValidationError(ErrorMessages.MICROSERVICE_TMPFS_SHAPE)
  }
  for (const entry of tmpfs) {
    if (!entry || typeof entry !== 'object') {
      throw new Errors.ValidationError(ErrorMessages.MICROSERVICE_TMPFS_SHAPE)
    }
    if (!isAbsoluteContainerPath(entry.containerPath) && entry.containerPath !== '/') {
      throw new Errors.ValidationError(ErrorMessages.MICROSERVICE_TMPFS_PATH)
    }
    if (entry.size != null && (typeof entry.size !== 'number' || entry.size <= 0)) {
      throw new Errors.ValidationError(ErrorMessages.MICROSERVICE_TMPFS_SIZE)
    }
  }
}

function validateContainerFields (spec, existing = {}) {
  const data = spec || {}
  assertArgv('entrypoint', data.entrypoint)
  const argv = resolveProcessArgv(data)
  assertArgv('commands', argv)

  const runAsUser = pickValue(data, existing, 'runAsUser')
  const runAsGroup = pickValue(data, existing, 'runAsGroup')
  if (typeof runAsUser === 'string' && runAsUser.includes(':') && runAsGroup) {
    throw new Errors.ValidationError(ErrorMessages.MICROSERVICE_RUN_AS_USER_GROUP_CONFLICT)
  }

  const workingDir = data.workingDir
  if (workingDir != null && workingDir !== '' && !isAbsoluteContainerPath(workingDir) && workingDir !== '/') {
    throw new Errors.ValidationError(ErrorMessages.MICROSERVICE_WORKING_DIR_ABSOLUTE)
  }

  assertPositiveNumber('cpus', data.cpus)
  assertPositiveNumber('memoryReservation', data.memoryReservation)
  assertPositiveNumber('shmSize', data.shmSize)

  const memoryLimit = pickValue(data, existing, 'memoryLimit')
  if (data.memorySwap != null && data.memorySwap !== '') {
    if (typeof data.memorySwap !== 'number' || Number.isNaN(data.memorySwap)) {
      throw new Errors.ValidationError(ErrorMessages.MICROSERVICE_MEMORY_SWAP_VALUE)
    }
    if (data.memorySwap !== -1) {
      if (data.memorySwap <= 0) {
        throw new Errors.ValidationError(ErrorMessages.MICROSERVICE_MEMORY_SWAP_VALUE)
      }
      if (memoryLimit == null || memoryLimit === '') {
        throw new Errors.ValidationError(ErrorMessages.MICROSERVICE_MEMORY_SWAP_REQUIRES_LIMIT)
      }
    }
  }

  const hostNetworkMode = pickValue(data, existing, 'hostNetworkMode')
  const ipcMode = pickValue(data, existing, 'ipcMode')
  if (data.sysctls !== undefined) {
    data.sysctls = normalizeSysctls(data.sysctls)
  }
  validateSysctls(data.sysctls, hostNetworkMode, ipcMode)
  validateUlimits(data.ulimits)
  validateDevices(data.devices)
  validateTmpfs(data.tmpfs)
}

function serializeContainerColumns (spec) {
  const data = spec || {}
  const columns = {}
  if (data.runAsGroup !== undefined) {
    columns.runAsGroup = data.runAsGroup
  }
  if (data.readOnlyRootFilesystem !== undefined) {
    columns.readOnlyRootFilesystem = data.readOnlyRootFilesystem
  }
  if (data.workingDir !== undefined) {
    columns.workingDir = data.workingDir
  }
  if (data.cpus !== undefined) {
    columns.cpus = data.cpus
  }
  if (data.memoryReservation !== undefined) {
    columns.memoryReservation = data.memoryReservation
  }
  if (data.memorySwap !== undefined) {
    columns.memorySwap = data.memorySwap
  }
  if (data.shmSize !== undefined) {
    columns.shmSize = data.shmSize
  }
  if (data.sysctls !== undefined) {
    const sysctls = normalizeSysctls(data.sysctls)
    columns.sysctls = sysctls && Object.keys(sysctls).length > 0
      ? serializeJsonField(sysctls)
      : null
  }
  return columns
}

function containerFieldsRequireRebuild (spec, existing) {
  if (!spec) {
    return false
  }
  const scalarKeys = [
    'runAsGroup', 'readOnlyRootFilesystem', 'workingDir', 'cpus',
    'memoryReservation', 'memorySwap', 'shmSize'
  ]
  for (const key of scalarKeys) {
    if (spec[key] !== undefined && spec[key] !== existing[key]) {
      return true
    }
  }
  if (spec.entrypoint !== undefined) {
    return true
  }
  if (resolveProcessArgv(spec) !== undefined) {
    return true
  }
  if (spec.sysctls !== undefined || spec.ulimits !== undefined ||
      spec.devices !== undefined || spec.tmpfs !== undefined) {
    return true
  }
  if (spec.models !== undefined && catalogRequiresRebuild(existing.models, normalizeCatalog(spec.models))) {
    return true
  }
  if (spec.knowledge !== undefined && catalogRequiresRebuild(existing.knowledge, normalizeCatalog(spec.knowledge))) {
    return true
  }
  return false
}

function sortRowsById (rows) {
  return Array.isArray(rows) ? rows.slice().sort((left, right) => (left.id || 0) - (right.id || 0)) : []
}

function tokensFromRows (rows, field) {
  return sortRowsById(rows).map((row) => row[field]).filter((token) => typeof token === 'string')
}

function devicesFromRows (rows) {
  return sortRowsById(rows).map((row) => ({
    hostPath: row.hostPath,
    containerPath: row.containerPath,
    permissions: row.permissions || 'rwm'
  }))
}

function tmpfsFromRows (rows) {
  return sortRowsById(rows).map((row) => {
    const entry = { containerPath: row.containerPath }
    if (row.size != null) {
      entry.size = row.size
    }
    if (row.mode) {
      entry.mode = row.mode
    }
    return entry
  })
}

function ulimitsFromRows (rows) {
  const ulimits = {}
  for (const row of sortRowsById(rows)) {
    ulimits[row.name] = { soft: row.soft, hard: row.hard }
  }
  return ulimits
}

function catalogFromRows (catalogRow, itemRows) {
  const items = sortRowsById(itemRows).map((row) => ({ name: row.name }))
  if (!catalogRow && items.length === 0) {
    return null
  }
  return {
    bindPath: catalogRow ? catalogRow.bindPath : '',
    permissions: (catalogRow && catalogRow.permissions) || 'ro',
    items
  }
}

function hydrateJsonColumns (row) {
  if (!row) {
    return row
  }
  const hydrated = { ...row }
  hydrated.sysctls = parseJsonField(row.sysctls)
  return hydrated
}

function applyAgentContainerFields (response, microservice, extras = {}) {
  const cmdFromArgs = Array.isArray(extras) ? extras : extras.cmd
  const entrypoint = extras.entrypoint || []
  if (entrypoint.length > 0) {
    response.entrypoint = entrypoint
  }

  const argv = extras.commands || (Array.isArray(cmdFromArgs) ? cmdFromArgs : [])
  if (argv.length > 0) {
    response.commands = argv
    response.cmd = argv
  } else if (Array.isArray(cmdFromArgs)) {
    response.cmd = cmdFromArgs
  }

  if (microservice.runAsGroup) {
    response.runAsGroup = microservice.runAsGroup
  }
  if (microservice.readOnlyRootFilesystem) {
    response.readOnlyRootFilesystem = true
  }
  if (microservice.workingDir) {
    response.workingDir = microservice.workingDir
  }
  if (microservice.cpus != null) {
    response.cpus = microservice.cpus
  }
  if (microservice.memoryReservation != null) {
    response.memoryReservation = microservice.memoryReservation
  }
  if (microservice.memorySwap != null) {
    response.memorySwap = microservice.memorySwap
  }
  if (microservice.shmSize != null) {
    response.shmSize = microservice.shmSize
  }

  const sysctls = parseJsonField(microservice.sysctls)
  if (sysctls && typeof sysctls === 'object' && Object.keys(sysctls).length > 0) {
    response.sysctls = sysctls
  }
  const ulimits = extras.ulimits
  if (ulimits && typeof ulimits === 'object' && Object.keys(ulimits).length > 0) {
    response.ulimits = ulimits
  }
  if (Array.isArray(extras.devices) && extras.devices.length > 0) {
    response.devices = extras.devices
  }
  if (Array.isArray(extras.tmpfs) && extras.tmpfs.length > 0) {
    response.tmpfs = extras.tmpfs
  }
  if (!isCatalogEmpty(extras.models)) {
    response.models = extras.models
  }
  if (!isCatalogEmpty(extras.knowledge)) {
    response.knowledge = extras.knowledge
  }

  return response
}

module.exports = {
  parseJsonField,
  serializeJsonField,
  parseArgv,
  serializeArgv,
  resolveProcessArgv,
  isCatalogEmpty,
  parseCatalog,
  normalizeCatalog,
  serializeCatalog,
  catalogItemNames,
  catalogRequiresRebuild,
  validateCatalog,
  validateContainerFields,
  serializeContainerColumns,
  containerFieldsRequireRebuild,
  hydrateJsonColumns,
  applyAgentContainerFields,
  normalizeSysctls,
  tokensFromRows,
  devicesFromRows,
  tmpfsFromRows,
  ulimitsFromRows,
  catalogFromRows
}
