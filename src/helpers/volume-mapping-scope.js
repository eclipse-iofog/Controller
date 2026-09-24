'use strict'

const path = require('path')

const Errors = require('./errors')

const PRIVATE_SCOPE = 'private'
const SHARED_SCOPE = 'shared'
const VOLUME_TYPE = 'volume'
const BIND_TYPE = 'bind'
const VOLUME_NAME_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/
const WINDOWS_ABS_HOST_PATH = /^[a-zA-Z]:[\\/].+/

const INVALID_VOLUME_NAME_MESSAGE = 'hostDestination includes invalid characters for a local volume name, only ' +
  '"[a-zA-Z0-9][a-zA-Z0-9_.-]" are allowed. If you intended to pass a host directory, use type: bind'

const INVALID_BIND_HOST_PATH_MESSAGE =
  'hostDestination must be an absolute host path when type is bind'

function isValidBindHostDestination (hostDestination) {
  if (typeof hostDestination !== 'string') {
    return false
  }
  const trimmed = hostDestination.trim()
  if (trimmed === '') {
    return false
  }
  return path.isAbsolute(trimmed) || WINDOWS_ABS_HOST_PATH.test(trimmed)
}

function applyVolumeMappingScope (mapping, options = {}) {
  if (!mapping) {
    return mapping
  }

  if (mapping.type === BIND_TYPE) {
    if (!isValidBindHostDestination(mapping.hostDestination)) {
      throw new Errors.InvalidArgumentError(INVALID_BIND_HOST_PATH_MESSAGE)
    }
    mapping.scope = PRIVATE_SCOPE
    return mapping
  }

  if (mapping.type !== VOLUME_TYPE) {
    mapping.scope = PRIVATE_SCOPE
    return mapping
  }

  if (typeof mapping.hostDestination !== 'string' || !VOLUME_NAME_PATTERN.test(mapping.hostDestination)) {
    throw new Errors.InvalidArgumentError(INVALID_VOLUME_NAME_MESSAGE)
  }

  const raw = mapping.scope
  if (raw == null) {
    mapping.scope = PRIVATE_SCOPE
  } else if (typeof raw !== 'string') {
    throw new Errors.ValidationError(`Unknown volume mapping scope '${raw}'`)
  } else {
    const trimmed = raw.trim()
    if (trimmed === '') {
      mapping.scope = PRIVATE_SCOPE
    } else {
      const normalized = trimmed.toLowerCase()
      if (normalized !== PRIVATE_SCOPE && normalized !== SHARED_SCOPE) {
        throw new Errors.ValidationError(`Unknown volume mapping scope '${raw}'`)
      }
      mapping.scope = normalized
    }
  }

  if (options.rejectShared && mapping.scope === SHARED_SCOPE) {
    throw new Errors.ValidationError(
      'Shared volume mapping scope is not allowed on controller or system microservices'
    )
  }

  return mapping
}

module.exports = {
  applyVolumeMappingScope,
  isValidBindHostDestination,
  PRIVATE_SCOPE,
  SHARED_SCOPE,
  VOLUME_NAME_PATTERN
}
