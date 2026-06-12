'use strict'

const config = require('./index')
const { DEFAULT_POLICY } = require('./auth-policy-defaults')
const { getSessionStoreTtlMs } = require('./auth-session-store')
const { applyTokenTtlOverrides } = require('./auth-token-ttl')

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

function resolveOauthFlowTtlSeconds () {
  const override = getConfiguredSeconds('auth.oidcTtl.interactionTtlSeconds', 'AUTH_OIDC_INTERACTION_TTL_SECONDS')
  if (override !== null) {
    return override
  }
  return Math.max(1, Math.floor(getSessionStoreTtlMs() / 1000))
}

function resolveGrantTtlSeconds () {
  const override = getConfiguredSeconds('auth.oidcTtl.grantTtlSeconds', 'AUTH_OIDC_GRANT_TTL_SECONDS')
  if (override !== null) {
    return override
  }
  return resolveOauthFlowTtlSeconds()
}

function resolveSessionTtlSeconds (policy) {
  const override = getConfiguredSeconds('auth.oidcTtl.sessionTtlSeconds', 'AUTH_OIDC_SESSION_TTL_SECONDS')
  if (override !== null) {
    return override
  }
  return (policy && policy.refreshTokenTtlSeconds) || DEFAULT_POLICY.refreshTokenTtlSeconds
}

function resolveIdTokenTtlSeconds (policy) {
  const override = getConfiguredSeconds('auth.oidcTtl.idTokenTtlSeconds', 'AUTH_OIDC_ID_TOKEN_TTL_SECONDS')
  if (override !== null) {
    return override
  }
  return (policy && policy.accessTokenTtlSeconds) || DEFAULT_POLICY.accessTokenTtlSeconds
}

function resolveOidcProviderTtls (policy) {
  const normalizedPolicy = applyTokenTtlOverrides(policy || {})
  return {
    accessTokenTtlSeconds: normalizedPolicy.accessTokenTtlSeconds,
    refreshTokenTtlSeconds: normalizedPolicy.refreshTokenTtlSeconds,
    idTokenTtlSeconds: resolveIdTokenTtlSeconds(normalizedPolicy),
    interactionTtlSeconds: resolveOauthFlowTtlSeconds(),
    grantTtlSeconds: resolveGrantTtlSeconds(),
    sessionTtlSeconds: resolveSessionTtlSeconds(normalizedPolicy)
  }
}

async function loadOidcProviderTtls (db) {
  const policy = db.AuthPolicy ? await db.AuthPolicy.findByPk(1) : null
  const plainPolicy = policy
    ? (typeof policy.get === 'function' ? policy.get({ plain: true }) : policy)
    : null
  return resolveOidcProviderTtls(plainPolicy)
}

module.exports = {
  resolveOidcProviderTtls,
  loadOidcProviderTtls
}
