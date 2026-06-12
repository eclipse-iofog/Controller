/**
 * Temporary shim for server.js until phase 8-3 migrates to ./oidc.js.
 */
const {
  initOidc,
  getOidc,
  getOidcMiddleware,
  getMemoryStore
} = require('./oidc')

function initKeycloak () {
  return initOidc()
}

function getKeycloak () {
  return getOidc()
}

module.exports = {
  initKeycloak,
  getKeycloak,
  getMemoryStore,
  getOidcMiddleware
}
