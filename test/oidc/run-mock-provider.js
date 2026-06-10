#!/usr/bin/env node
/*
 * Standalone mock OIDC issuer for local dev smoke runs.
 *
 * Usage:
 *   node test/oidc/run-mock-provider.js
 *
 * Then point Controller at the printed OIDC_* values and restart start-dev.
 */

const { MockOidcProvider } = require('../support/mock-oidc-provider')
const { enableMockOidcTls } = require('../support/oidc-test-helpers')

async function main () {
  enableMockOidcTls()
  const provider = new MockOidcProvider()
  await provider.start()

  const env = provider.getEnv()
  console.log('Mock OIDC provider listening')
  console.log(`  issuer: ${env.OIDC_ISSUER_URL}`)
  console.log('')
  console.log('Export for Controller:')
  for (const [key, value] of Object.entries(env)) {
    console.log(`  export ${key}='${value}'`)
  }
  console.log('')
  console.log('For local smoke, also run:')
  console.log("  export NODE_TLS_REJECT_UNAUTHORIZED=0")
  console.log('')
  console.log('Press Ctrl+C to stop.')

  const shutdown = async () => {
    await provider.stop()
    process.exit(0)
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}

module.exports = { main }
