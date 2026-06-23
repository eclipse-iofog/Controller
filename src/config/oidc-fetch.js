const { Agent, fetch: undiciFetch } = require('undici')
const { getListenerTlsMaterial, getListenerTrustCaBuffers } = require('../utils/tls-config')

let cachedFetch

function resetEmbeddedOidcFetchForTests () {
  cachedFetch = undefined
}

function createEmbeddedOidcFetch () {
  const material = getListenerTlsMaterial()
  if (!material.enabled) {
    return undefined
  }

  const caBuffers = getListenerTrustCaBuffers(material)
  if (!caBuffers?.length) {
    return undefined
  }

  if (!cachedFetch) {
    const agent = new Agent({
      connect: {
        ca: caBuffers,
        rejectUnauthorized: true
      }
    })
    cachedFetch = (url, init) => undiciFetch(url, { ...init, dispatcher: agent })
  }

  return cachedFetch
}

module.exports = {
  createEmbeddedOidcFetch,
  resetEmbeddedOidcFetchForTests
}
