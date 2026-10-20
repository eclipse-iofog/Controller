const https = require('https')
const tls = require('tls')
const { Agent, fetch: undiciFetch } = require('undici')
const config = require('./index')
const { loadCertificate } = require('../utils/ssl-utils')
const { getListenerTlsMaterial, getListenerTrustCaBuffers } = require('../utils/tls-config')

let cachedFetch
let cachedExternalFetch
let cachedExternalCaKey

function resetEmbeddedOidcFetchForTests () {
  cachedFetch = undefined
}

function resetExternalOidcFetchForTests () {
  cachedExternalFetch = undefined
  cachedExternalCaKey = undefined
}

function trimConfigValue (value) {
  if (typeof value !== 'string') {
    return ''
  }
  return value.trim()
}

function readExternalIssuerCaSource () {
  const pathValue = trimConfigValue(
    process.env.OIDC_ISSUER_TLS_PATH_CA || config.get('auth.issuer.tls.path.ca')
  )
  if (pathValue) {
    return { source: pathValue, isBase64: false }
  }

  const base64Value = trimConfigValue(
    process.env.OIDC_ISSUER_TLS_BASE64_CA || config.get('auth.issuer.tls.base64.ca')
  )
  if (base64Value) {
    return { source: base64Value, isBase64: true }
  }

  return undefined
}

function hasExternalIssuerCaConfig () {
  return readExternalIssuerCaSource() !== undefined
}

function getExternalIssuerCaBuffer () {
  const material = readExternalIssuerCaSource()
  if (!material) {
    return undefined
  }
  return loadCertificate(material.source, material.isBase64)
}

function buildIssuerTrustCaList (privateCa) {
  return [privateCa, ...tls.rootCertificates]
}

function createExternalOidcFetch (caBuffer) {
  const cacheKey = caBuffer.toString('base64')
  if (cachedExternalFetch && cachedExternalCaKey === cacheKey) {
    return cachedExternalFetch
  }

  const agent = new Agent({
    connect: {
      ca: buildIssuerTrustCaList(caBuffer),
      rejectUnauthorized: true
    }
  })
  cachedExternalCaKey = cacheKey
  cachedExternalFetch = (url, init) => undiciFetch(url, { ...init, dispatcher: agent })
  return cachedExternalFetch
}

function createExternalIssuerHttpsAgent (caBuffer) {
  return new https.Agent({
    ca: buildIssuerTrustCaList(caBuffer),
    rejectUnauthorized: true
  })
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
  resetEmbeddedOidcFetchForTests,
  hasExternalIssuerCaConfig,
  getExternalIssuerCaBuffer,
  createExternalOidcFetch,
  createExternalIssuerHttpsAgent,
  resetExternalOidcFetchForTests
}
