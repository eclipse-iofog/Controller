const RbacRoleBindingManager = require('../../data/managers/rbac-role-binding-manager')
const RbacRoleManager = require('../../data/managers/rbac-role-manager')
const RbacCacheVersionManager = require('../../data/managers/rbac-cache-version-manager')
const transactionRunner = require('../../helpers/transaction-runner')
const logger = require('../../logger')

// Simple in-memory cache for authorization decisions
// Key format: `${subjectKind}:${subjectName}:${apiGroup}:${resource}:${verb}:${resourceName}`
const authCache = new Map()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes
const MAX_CACHE_SIZE = 10000
const VERSION_CHECK_INTERVAL_MS = 1000

// Track last known cache version to detect changes across instances
let lastKnownVersion = null
let lastVersionCheckAt = 0

/**
 * Check if a value matches a pattern (supports wildcard *)
 */
function matchesPattern (value, pattern) {
  if (pattern === '*' || pattern === value) {
    return true
  }
  // Simple wildcard matching
  if (pattern.includes('*')) {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$')
    return regex.test(value)
  }
  return false
}

/**
 * Check if a value is in an array or matches wildcard
 */
function matchesArray (value, array) {
  if (!array || array.length === 0) {
    return false
  }
  return array.some(item => matchesPattern(value, item))
}

function buildCacheKey (subjects, apiGroup, resource, verb, resourceName) {
  return `${JSON.stringify(subjects)}:${apiGroup}:${resource}:${verb}:${resourceName || ''}`
}

function getCachedResult (cacheKey) {
  const cached = authCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.result
  }
  return null
}

function storeCachedResult (cacheKey, result) {
  if (authCache.size < MAX_CACHE_SIZE) {
    authCache.set(cacheKey, { result, timestamp: Date.now() })
  }
}

function isVersionCheckFresh () {
  return lastKnownVersion !== null &&
    (Date.now() - lastVersionCheckAt) < VERSION_CHECK_INTERVAL_MS
}

async function ensureVersionFresh () {
  try {
    const currentVersion = await RbacCacheVersionManager.getVersionWithoutTransaction()
    if (lastKnownVersion !== null && currentVersion !== lastKnownVersion) {
      logger.info('Cache version changed - clearing cache')
      authCache.clear()
    }
    lastKnownVersion = currentVersion
  } catch (error) {
    logger.warn(`Error checking cache version: ${error.message}`)
  } finally {
    lastVersionCheckAt = Date.now()
  }
}

/**
 * Resolve all rules for a subject
 */
async function resolveRulesForSubject (subject, transaction) {
  const bindings = await RbacRoleBindingManager.findRoleBindingsBySubject(subject, transaction)
  const allRules = []

  for (const binding of bindings) {
    const roleRef = binding.roleRef
    if (roleRef && roleRef.kind === 'Role' && roleRef.name) {
      // getRoleWithRules handles both system roles (static) and database roles
      const role = await RbacRoleManager.getRoleWithRules(roleRef.name, transaction)
      if (role && role.rules) {
        allRules.push(...role.rules)
      }
    }
  }

  return allRules
}

/**
 * Evaluate if a rule allows the requested action
 */
function evaluateRule (rule, apiGroup, resource, verb, resourceName) {
  // Check apiGroups
  const apiGroups = rule.apiGroups || ['']
  if (!matchesArray(apiGroup || '', apiGroups)) {
    return false
  }

  // Check resources
  const resources = rule.resources || []
  if (!matchesArray(resource, resources)) {
    return false
  }

  // Check verbs
  const verbs = rule.verbs || []
  if (!matchesArray(verb, verbs)) {
    return false
  }

  // Check resourceNames if specified
  if (rule.resourceNames && rule.resourceNames.length > 0) {
    if (!resourceName || !matchesArray(resourceName, rule.resourceNames)) {
      return false
    }
  }

  return true
}

/**
 * Full authorization path (requires a database transaction).
 * Used on cache miss after a cheap version check.
 */
async function authorize (subjects, apiGroup, resource, verb, resourceName, transaction) {
  if (!subjects || !Array.isArray(subjects) || subjects.length === 0) {
    return { allowed: false, reason: 'No subjects provided' }
  }

  const cacheKey = buildCacheKey(subjects, apiGroup, resource, verb, resourceName)
  const cached = getCachedResult(cacheKey)
  if (cached) {
    return cached
  }

  // Check system roles first (Admin, SRE, Developer, Viewer)
  // These work directly without RoleBindings when OIDC group/role name matches
  for (const subject of subjects) {
    if (subject.kind === 'Group' && subject.name) {
      const roleName = subject.name.toLowerCase()

      // Check if it matches a system role
      if (RbacRoleManager.isSystemRole(roleName)) {
        const systemRole = RbacRoleManager.getSystemRole(roleName)
        if (systemRole && systemRole.rules && Array.isArray(systemRole.rules)) {
          // Check if the system role's rules allow this action
          const rules = systemRole.rules
          for (const rule of rules) {
            try {
              if (evaluateRule(rule, apiGroup, resource, verb, resourceName)) {
                const result = { allowed: true, reason: `${roleName} system role has permission` }
                storeCachedResult(cacheKey, result)
                return result
              }
            } catch (ruleError) {
              // Log error but continue to next rule
              logger.error('Error evaluating rule:', JSON.stringify({
                error: ruleError.message,
                stack: ruleError.stack,
                rule: rule,
                apiGroup,
                resource,
                verb,
                resourceName
              }))
            }
          }
        }
      }
    }
  }

  // Also check RoleBindings (for custom roles or if system role check didn't match)
  // This handles cases where subjects are bound to roles via RoleBindings
  const allRules = []
  for (const subject of subjects) {
    try {
      const rules = await resolveRulesForSubject(subject, transaction)
      if (rules && Array.isArray(rules)) {
        allRules.push(...rules)
      }
    } catch (error) {
      // Log error but continue to next subject
      logger.error('Error resolving rules for subject:', JSON.stringify({
        error: error.message,
        stack: error.stack,
        subject
      }))
    }
  }

  // Evaluate rules from RoleBindings
  for (const rule of allRules) {
    try {
      if (evaluateRule(rule, apiGroup, resource, verb, resourceName)) {
        const result = { allowed: true, reason: 'Rule matched' }
        storeCachedResult(cacheKey, result)
        return result
      }
    } catch (ruleError) {
      // Log error but continue to next rule
      logger.error('Error evaluating rule from RoleBinding:', JSON.stringify({
        error: ruleError.message,
        stack: ruleError.stack,
        rule: rule,
        apiGroup,
        resource,
        verb,
        resourceName
      }))
    }
  }

  // Deny by default
  const result = { allowed: false, reason: 'Authorization denied: You do not have permission to perform this action. Please contact your administrator.' }
  storeCachedResult(cacheKey, result)
  return result
}

/**
 * Authorize a request with cache fast path (no DB on cache hit within version window).
 * @param {Array} subjects - Array of subjects {kind, name}
 * @param {string} apiGroup - API group (empty string for core)
 * @param {string} resource - Resource name (e.g., 'microservices')
 * @param {string} verb - Verb (e.g., 'get', 'create', 'patch')
 * @param {string} resourceName - Optional resource instance name (e.g., microservice UUID)
 * @returns {Promise<{allowed: boolean, reason?: string}>}
 */
async function authorizeRequest (subjects, apiGroup, resource, verb, resourceName) {
  if (!subjects || !Array.isArray(subjects) || subjects.length === 0) {
    return { allowed: false, reason: 'No subjects provided' }
  }

  const cacheKey = buildCacheKey(subjects, apiGroup, resource, verb, resourceName)

  if (isVersionCheckFresh()) {
    const cached = getCachedResult(cacheKey)
    if (cached) {
      return cached
    }
  } else {
    await ensureVersionFresh()
    const cached = getCachedResult(cacheKey)
    if (cached) {
      return cached
    }
  }

  return transactionRunner.runInTransaction(
    (transaction) => authorize(subjects, apiGroup, resource, verb, resourceName, transaction),
    { label: 'rbac-authorize' }
  )
}

/**
 * Clear authorization cache
 */
function clearCache () {
  authCache.clear()
}

/**
 * Clean expired cache entries
 */
function cleanCache () {
  const now = Date.now()
  for (const [key, value] of authCache.entries()) {
    if (now - value.timestamp >= CACHE_TTL) {
      authCache.delete(key)
    }
  }
}

function _resetStateForTests () {
  authCache.clear()
  lastKnownVersion = null
  lastVersionCheckAt = 0
}

function _setVersionCheckStateForTests ({ lastKnownVersion: version, lastVersionCheckAt: checkedAt } = {}) {
  if (version !== undefined) {
    lastKnownVersion = version
  }
  if (checkedAt !== undefined) {
    lastVersionCheckAt = checkedAt
  }
}

// Clean cache every 10 minutes
setInterval(cleanCache, 10 * 60 * 1000)

module.exports = {
  authorize,
  authorizeRequest,
  clearCache,
  cleanCache,
  _resetStateForTests,
  _setVersionCheckStateForTests,
  VERSION_CHECK_INTERVAL_MS
}
