/*
 *  *******************************************************************************
 *  * Copyright (c) 2023 Datasance Teknoloji A.S.
 *  *
 *  * This program and the accompanying materials are made available under the
 *  * terms of the Eclipse Public License v. 2.0 which is available at
 *  * http://www.eclipse.org/legal/epl-2.0
 *  *
 *  * SPDX-License-Identifier: EPL-2.0
 *  *******************************************************************************
 *
 */

const RbacRoleBindingManager = require('../../data/managers/rbac-role-binding-manager')
const RbacRoleManager = require('../../data/managers/rbac-role-manager')
const RbacCacheVersionManager = require('../../data/managers/rbac-cache-version-manager')
const logger = require('../../logger')


// Simple in-memory cache for authorization decisions
// Key format: `${subjectKind}:${subjectName}:${apiGroup}:${resource}:${verb}:${resourceName}`
const authCache = new Map()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes
const MAX_CACHE_SIZE = 10000

// Track last known cache version to detect changes across instances
let lastKnownVersion = null

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
 * Authorize a request
 * @param {Array} subjects - Array of subjects {kind, name}
 * @param {string} apiGroup - API group (empty string for core)
 * @param {string} resource - Resource name (e.g., 'microservices')
 * @param {string} verb - Verb (e.g., 'get', 'create', 'patch')
 * @param {string} resourceName - Optional resource instance name (e.g., microservice UUID)
 * @param {Object} transaction - Database transaction
 * @returns {Promise<{allowed: boolean, reason?: string}>}
 */
async function authorize (subjects, apiGroup, resource, verb, resourceName, transaction) {
  if (!subjects || !Array.isArray(subjects) || subjects.length === 0) {
    return { allowed: false, reason: 'No subjects provided' }
  }

  // Check if cache version has changed (for multi-instance cache invalidation)
  try {
    const currentVersion = await RbacCacheVersionManager.getVersion(transaction)
    if (lastKnownVersion !== null && currentVersion !== lastKnownVersion) {
      // Cache version changed - clear local cache
      logger.info('Cache version changed - clearing cache')
      authCache.clear()
    }
    lastKnownVersion = currentVersion
  } catch (error) {
    // Log error but continue - if version check fails, we'll just skip cache version check
    logger.warn(`Error checking cache version: ${error.message}`)
  }

  // Check cache
  const cacheKey = `${JSON.stringify(subjects)}:${apiGroup}:${resource}:${verb}:${resourceName || ''}`
  const cached = authCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.result
  }

  // Check system roles first (Admin, SRE, Developer, Viewer)
  // These work directly without RoleBindings when Keycloak role name matches
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
                // Cache result
                if (authCache.size < MAX_CACHE_SIZE) {
                  authCache.set(cacheKey, { result, timestamp: Date.now() })
                }
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
        // Cache result
        if (authCache.size < MAX_CACHE_SIZE) {
          authCache.set(cacheKey, { result, timestamp: Date.now() })
        }
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
  // Cache result
  if (authCache.size < MAX_CACHE_SIZE) {
    authCache.set(cacheKey, { result, timestamp: Date.now() })
  }
  return result
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

// Clean cache every 10 minutes
setInterval(cleanCache, 10 * 60 * 1000)

module.exports = {
  authorize,
  clearCache,
  cleanCache
}


