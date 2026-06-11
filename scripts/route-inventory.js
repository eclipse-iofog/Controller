#!/usr/bin/env node
/*
 * List all registered Express routes from src/routes/**.
 */

const fs = require('fs')
const path = require('path')

const ROUTES_DIR = path.join(__dirname, '..', 'src', 'routes')
const ROUTE_ENTRY_RE = /\{\s*method:\s*['"]([^'"]+)['"]\s*,\s*path:\s*['"]([^'"]+)['"]/g

function collectRoutesFromFile (filePath) {
  const source = fs.readFileSync(filePath, 'utf8')
  const routes = []
  let match

  while ((match = ROUTE_ENTRY_RE.exec(source)) !== null) {
    const blockStart = match.index
    const blockEnd = source.indexOf('\n  }', blockStart)
    const block = blockEnd === -1 ? source.slice(blockStart) : source.slice(blockStart, blockEnd)

    routes.push({
      method: match[1].toUpperCase(),
      path: match[2],
      supportSubstitution: /supportSubstitution:\s*true/.test(block),
      fileInput: (block.match(/fileInput:\s*['"]([^'"]+)['"]/) || [])[1] || null
    })
  }

  return routes
}

function collectAllRoutes () {
  const files = fs.readdirSync(ROUTES_DIR)
    .filter((name) => name.endsWith('.js'))
    .sort()

  const routes = []

  for (const file of files) {
    const filePath = path.join(ROUTES_DIR, file)
    for (const route of collectRoutesFromFile(filePath)) {
      routes.push({ ...route, sourceFile: file })
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

function toMarkdown (routes) {
  const lines = [
    '# Route inventory',
    '',
    `Generated from \`src/routes/**\` on ${new Date().toISOString().slice(0, 10)}.`,
    '',
    `**Total routes:** ${routes.length}`,
    '',
    '| Method | Path | Source file | Notes |',
    '|--------|------|-------------|-------|'
  ]

  for (const route of routes) {
    const notes = []
    if (route.method === 'WS') {
      notes.push('WebSocket')
    }
    if (route.supportSubstitution) {
      notes.push('template substitution')
    }
    if (route.fileInput) {
      notes.push(`file upload: ${route.fileInput}`)
    }

    lines.push(`| ${route.method} | \`${route.path}\` | \`${route.sourceFile}\` | ${notes.join('; ') || '—'} |`)
  }

  lines.push('')
  return lines.join('\n')
}

function main () {
  const format = process.argv.includes('--json') ? 'json' : 'markdown'
  const routes = collectAllRoutes()

  if (format === 'json') {
    process.stdout.write(JSON.stringify(routes, null, 2) + '\n')
    return
  }

  process.stdout.write(toMarkdown(routes))
}

if (require.main === module) {
  main()
}

module.exports = {
  collectAllRoutes,
  collectRoutesFromFile,
  toMarkdown
}
