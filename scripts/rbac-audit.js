#!/usr/bin/env node
/*
 * Compare live Express routes (src/routes/**) to rbac-resources.yaml.
 * Exits non-zero on gaps (unmapped routes) or orphans (stale yaml entries).
 * Plan 9 phase 9-5 — optional CI drift check.
 */

const fs = require('fs')
const path = require('path')
const yaml = require('js-yaml')
const { collectAllRoutes } = require('./route-inventory')

const RBAC_CATALOG_PATH = path.join(__dirname, '..', 'src', 'config', 'rbac-resources.yaml')

const BANNED_YAML_TERMS = ['edgeResources', 'diagnostics', 'fog-types']
const REQUIRED_YAML_TERMS = ['architectures', 'controller/register']

function routeKey (route) {
  return `${route.method} ${route.path}`
}

function collectYamlRoutes (catalogPath = RBAC_CATALOG_PATH) {
  const catalog = yaml.load(fs.readFileSync(catalogPath, 'utf8'))
  const routes = []

  for (const [resource, def] of Object.entries(catalog.resources || {})) {
    for (const route of def.routes || []) {
      for (const method of Object.keys(route.methods || {})) {
        routes.push({
          method: method.toUpperCase(),
          path: route.path,
          resource
        })
      }
    }
  }

  routes.sort((a, b) => {
    if (a.path !== b.path) {
      return a.path.localeCompare(b.path)
    }
    return a.method.localeCompare(b.method)
  })

  return routes
}

function compareRoutes (inventoryRoutes, yamlRoutes) {
  const inventoryByKey = new Map(inventoryRoutes.map((route) => [routeKey(route), route]))
  const yamlByKey = new Map(yamlRoutes.map((route) => [routeKey(route), route]))

  const gaps = inventoryRoutes
    .filter((route) => !yamlByKey.has(routeKey(route)))
    .map((route) => ({
      method: route.method,
      path: route.path,
      sourceFile: route.sourceFile
    }))

  const orphans = yamlRoutes
    .filter((route) => !inventoryByKey.has(routeKey(route)))
    .map((route) => ({
      method: route.method,
      path: route.path,
      resource: route.resource
    }))

  return { gaps, orphans }
}

function checkYamlTerms (catalogPath = RBAC_CATALOG_PATH) {
  const content = fs.readFileSync(catalogPath, 'utf8')
  const banned = BANNED_YAML_TERMS.filter((term) => content.includes(term))
  const missing = REQUIRED_YAML_TERMS.filter((term) => !content.includes(term))

  return { banned, missing }
}

function auditRbac () {
  const inventoryRoutes = collectAllRoutes()
  const yamlRoutes = collectYamlRoutes()
  const { gaps, orphans } = compareRoutes(inventoryRoutes, yamlRoutes)
  const { banned, missing } = checkYamlTerms()

  return {
    inventoryCount: inventoryRoutes.length,
    yamlCount: yamlRoutes.length,
    gaps,
    orphans,
    banned,
    missing
  }
}

function printReport (result) {
  const lines = [
    'RBAC audit failed.',
    '',
    `Inventory routes: ${result.inventoryCount}`,
    `YAML route-method entries: ${result.yamlCount}`
  ]

  if (result.gaps.length) {
    lines.push('', 'Gaps (live routes missing from rbac-resources.yaml):')
    for (const gap of result.gaps) {
      lines.push(`  ${gap.method} ${gap.path} (${gap.sourceFile})`)
    }
  }

  if (result.orphans.length) {
    lines.push('', 'Orphans (yaml entries with no live route):')
    for (const orphan of result.orphans) {
      lines.push(`  ${orphan.method} ${orphan.path} (${orphan.resource})`)
    }
  }

  if (result.banned.length) {
    lines.push('', 'Banned terms found in rbac-resources.yaml:', ...result.banned.map((term) => `  ${term}`))
  }

  if (result.missing.length) {
    lines.push('', 'Required terms missing from rbac-resources.yaml:', ...result.missing.map((term) => `  ${term}`))
  }

  process.stderr.write(lines.join('\n') + '\n')
}

function main () {
  const result = auditRbac()
  const failed = result.gaps.length > 0 ||
    result.orphans.length > 0 ||
    result.banned.length > 0 ||
    result.missing.length > 0

  if (failed) {
    printReport(result)
    process.exit(1)
  }

  process.stdout.write(
    `RBAC audit passed: ${result.inventoryCount} routes matched, no drift.\n`
  )
}

if (require.main === module) {
  main()
}

module.exports = {
  auditRbac,
  collectYamlRoutes,
  compareRoutes,
  checkYamlTerms,
  routeKey
}
