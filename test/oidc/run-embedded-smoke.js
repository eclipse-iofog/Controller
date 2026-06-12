#!/usr/bin/env node
/*
 * Embedded auth dev smoke helper.
 *
 * Usage:
 *   node test/oidc/run-embedded-smoke.js
 *
 * Export the printed env vars, set bootstrap admin credentials, then start Controller.
 */

const EMBEDDED_PUBLIC_URL = 'https://controller.test'
const EMBEDDED_CLIENT_ID = 'controller'

function main () {
  console.log('Embedded auth smoke configuration')
  console.log('')
  console.log('Export for Controller:')
  console.log("  export AUTH_MODE='embedded'")
  console.log(`  export CONTROLLER_PUBLIC_URL='${EMBEDDED_PUBLIC_URL}'`)
  console.log(`  export OIDC_CLIENT_ID='${EMBEDDED_CLIENT_ID}'`)
  console.log("  export OIDC_BOOTSTRAP_ADMIN_USERNAME='admin'")
  console.log("  export OIDC_BOOTSTRAP_ADMIN_PASSWORD='ChangeMeSecure123!'")
  console.log('')
  console.log('Optional for local HTTP smoke:')
  console.log("  export AUTH_INSECURE_ALLOW_HTTP='true'")
  console.log('')
  console.log('Start Controller (dev mode):')
  console.log('  npm run start-dev')
  console.log('')
  console.log('Login smoke:')
  console.log('  curl -s -X POST http://localhost:51121/api/v3/user/login \\')
  console.log('    -H "Content-Type: application/json" \\')
  console.log('    -d \'{"email":"admin","password":"ChangeMeSecure123!"}\'')
  console.log('')
  console.log('Protected route smoke (replace <token>):')
  console.log('  curl -H "Authorization: Bearer <token>" http://localhost:51121/api/v3/user/profile')
  console.log('')
  console.log('Embedded OAuth BFF smoke (requires CONSOLE_URL + running Controller):')
  console.log("  export CONSOLE_URL='http://localhost:8008'")
  console.log('  open http://localhost:51121/api/v3/user/oauth/authorize')
  console.log('  # → redirects to Viewer /login/oauth?interaction=<uid>')
  console.log('  # → Viewer calls POST /api/v3/user/interaction/:uid/login (etc.)')
  console.log('  # → POST /api/v3/user/interaction/:uid/complete → redirectTo → callback → /login#tokens')
}

if (require.main === module) {
  main()
}

module.exports = { main }
