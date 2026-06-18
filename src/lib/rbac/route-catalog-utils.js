const fs = require('fs')
const path = require('path')
const yaml = require('js-yaml')
const logger = require('../../logger')

let routeCatalog = null

function loadRouteCatalog () {
  if (routeCatalog) {
    return routeCatalog
  }

  try {
    const catalogPath = path.resolve(__dirname, '../../config/rbac-resources.yaml')
    const fileContents = fs.readFileSync(catalogPath, 'utf8')
    routeCatalog = yaml.load(fileContents)
    return routeCatalog
  } catch (error) {
    logger.error('Failed to load RBAC route catalog:', error)
    throw new Error('RBAC route catalog not found or invalid')
  }
}

function normalizeRequestPath (requestPath) {
  let normalizedPath = requestPath
  try {
    if (requestPath.includes('?')) {
      normalizedPath = requestPath.split('?')[0]
    }
    if (normalizedPath.includes('#')) {
      normalizedPath = normalizedPath.split('#')[0]
    }
  } catch (error) {
    // If parsing fails, use path as-is
  }
  return normalizedPath.replace(/\/$/, '')
}

function isPublicCatalogRoute (method, requestPath) {
  if (!method || !requestPath) {
    return false
  }

  const catalog = loadRouteCatalog()
  if (!catalog || !catalog.resources) {
    return false
  }

  const normalizedPath = normalizeRequestPath(requestPath)
  const methodKey = method.toUpperCase() === 'WS' ? 'WS' : method.toUpperCase()

  for (const resourceDef of Object.values(catalog.resources)) {
    if (!resourceDef.routes || !Array.isArray(resourceDef.routes)) {
      continue
    }

    for (const route of resourceDef.routes) {
      const normalizedRoutePath = route.path.replace(/\/$/, '')
      const routePattern = normalizedRoutePath.replace(/:[^/]+/g, '([^/]+)')
      const routeRegex = new RegExp(`^${routePattern}$`)

      if (!routeRegex.test(normalizedPath)) {
        continue
      }

      const methods = route.methods || {}
      if (!Object.prototype.hasOwnProperty.call(methods, methodKey)) {
        continue
      }

      const verbs = methods[methodKey]
      if (Array.isArray(verbs) && verbs.length === 0) {
        return true
      }
    }
  }

  return false
}

function resetRouteCatalogForTests () {
  routeCatalog = null
}

module.exports = {
  loadRouteCatalog,
  normalizeRequestPath,
  isPublicCatalogRoute,
  resetRouteCatalogForTests
}
