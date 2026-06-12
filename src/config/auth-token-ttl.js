'use strict'

const config = require('./index')
const { DEFAULT_POLICY } = require('./auth-policy-defaults')

function parsePositiveSeconds (value, keyName) {
  if (value === undefined || value === null || value === '') {
    return null
  }
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${keyName} must be a positive number`)
  }
  return Math.floor(parsed)
}

function getConfiguredSeconds (configPath, envKey) {
  const fromEnv = parsePositiveSeconds(process.env[envKey], envKey)
  if (fromEnv !== null) {
    return fromEnv
  }
  return parsePositiveSeconds(config.get(configPath), configPath)
}

function applyTokenTtlOverrides (policy) {
  const normalized = policy || {}
  const accessOverride = getConfiguredSeconds('auth.tokenTtl.accessTokenTtlSeconds', 'AUTH_ACCESS_TOKEN_TTL_SECONDS')
  const refreshOverride = getConfiguredSeconds('auth.tokenTtl.refreshTokenTtlSeconds', 'AUTH_REFRESH_TOKEN_TTL_SECONDS')

  return {
    ...DEFAULT_POLICY,
    ...normalized,
    accessTokenTtlSeconds: accessOverride !== null
      ? accessOverride
      : (normalized.accessTokenTtlSeconds || DEFAULT_POLICY.accessTokenTtlSeconds),
    refreshTokenTtlSeconds: refreshOverride !== null
      ? refreshOverride
      : (normalized.refreshTokenTtlSeconds || DEFAULT_POLICY.refreshTokenTtlSeconds)
  }
}

module.exports = {
  applyTokenTtlOverrides,
  getConfiguredSeconds
}
