const LIVE_RUNTIME_STATUS = 'RUNNING'

function isLiveRuntimeStatus (status) {
  return status === LIVE_RUNTIME_STATUS
}

function zeroRuntimeMetrics () {
  return {
    cpuUsage: 0,
    memoryUsage: 0,
    startTime: 0,
    operatingDuration: 0
  }
}

function coerceRuntimeMetric (value) {
  if (value === undefined || value === null || value === '') {
    return 0
  }
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : 0
}

function applyRuntimeMetrics (patch, observedStatus) {
  if (!patch) {
    return patch
  }
  if (!isLiveRuntimeStatus(observedStatus)) {
    Object.assign(patch, zeroRuntimeMetrics())
  }
  return patch
}

function _cloneStatusRow (statusRow) {
  if (statusRow == null) {
    return statusRow
  }
  if (typeof statusRow.get === 'function') {
    return statusRow.get({ plain: true })
  }
  if (statusRow.dataValues) {
    return Object.assign({}, statusRow.dataValues)
  }
  return Object.assign({}, statusRow)
}

function coerceCrashText (value) {
  if (value === undefined || value === null) {
    return undefined
  }
  if (typeof value === 'string') {
    return value
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }
  return undefined
}

function coerceOptionalNonNegativeInt (value) {
  if (value === undefined || value === null || value === '') {
    return undefined
  }
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric < 0) {
    return undefined
  }
  return Math.floor(numeric)
}

function applyCrashExtras (patch, reported) {
  if (!patch || !reported) {
    return patch
  }
  const lastErrorText = coerceCrashText(reported.lastError)
  const lastErrorPresent = lastErrorText !== undefined && lastErrorText.length > 0
  const lastErrorAt = coerceOptionalNonNegativeInt(reported.lastErrorAt)
  const lastErrorAtPresent = lastErrorAt !== undefined && lastErrorAt > 0
  const restartCountFieldSent = reported.restartCount !== undefined &&
    reported.restartCount !== null && reported.restartCount !== ''
  const restartCount = coerceOptionalNonNegativeInt(reported.restartCount)

  if (lastErrorPresent) {
    patch.lastError = lastErrorText
  }
  if (lastErrorAtPresent) {
    patch.lastErrorAt = lastErrorAt
  }
  if (restartCountFieldSent) {
    if (restartCount !== undefined) {
      patch.restartCount = restartCount
    }
  } else if (lastErrorPresent || lastErrorAtPresent) {
    patch.restartCount = 0
  }
  return patch
}

function projectCrashExtras (projected) {
  if (!projected) {
    return projected
  }
  if (projected.lastError == null) {
    projected.lastError = ''
  }
  const lastErrorAt = Number(projected.lastErrorAt)
  projected.lastErrorAt = Number.isFinite(lastErrorAt) ? lastErrorAt : 0
  const restartCount = Number(projected.restartCount)
  projected.restartCount = Number.isFinite(restartCount) ? restartCount : 0
  return projected
}

function projectStatusForApi (statusRow) {
  const projected = _cloneStatusRow(statusRow)
  if (!projected) {
    return projected
  }
  applyRuntimeMetrics(projected, projected.status)
  projectCrashExtras(projected)
  return projected
}

module.exports = {
  isLiveRuntimeStatus,
  zeroRuntimeMetrics,
  coerceRuntimeMetric,
  applyRuntimeMetrics,
  applyCrashExtras,
  projectCrashExtras,
  projectStatusForApi
}
