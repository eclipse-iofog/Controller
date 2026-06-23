const { X509Certificate } = require('crypto')
const config = require('../config')
const { loadCertificate } = require('./ssl-utils')

function trimEnv (value) {
  if (typeof value !== 'string') {
    return value
  }
  return value.trim()
}

function getListenerTlsMaterial () {
  const devMode = config.getBoolean('server.devMode', true)
  if (devMode) {
    return { enabled: false }
  }

  const tlsKey = trimEnv(process.env.TLS_PATH_KEY || config.get('server.tls.path.key'))
  const tlsCert = trimEnv(process.env.TLS_PATH_CERT || config.get('server.tls.path.cert'))
  const intermediateCert = trimEnv(
    process.env.TLS_PATH_INTERMEDIATE_CERT || config.get('server.tls.path.intermediateCert')
  )

  if (tlsKey && tlsCert) {
    return {
      enabled: true,
      key: tlsKey,
      cert: tlsCert,
      intermediateCert,
      isBase64: false
    }
  }

  const tlsKeyBase64 = process.env.TLS_BASE64_KEY || config.get('server.tls.base64.key')
  const tlsCertBase64 = process.env.TLS_BASE64_CERT || config.get('server.tls.base64.cert')
  const intermediateCertBase64 = process.env.TLS_BASE64_INTERMEDIATE_CERT ||
    config.get('server.tls.base64.intermediateCert')

  if (tlsKeyBase64 && tlsCertBase64) {
    return {
      enabled: true,
      key: tlsKeyBase64,
      cert: tlsCertBase64,
      intermediateCert: intermediateCertBase64,
      isBase64: true
    }
  }

  return { enabled: false }
}

function isSelfSignedCertBuffer (certBuffer) {
  try {
    const x509 = new X509Certificate(certBuffer)
    return x509.issuer === x509.subject
  } catch {
    return false
  }
}

function getListenerTrustCaBuffers (material = getListenerTlsMaterial()) {
  if (!material?.enabled) {
    return undefined
  }

  const buffers = []

  if (material.intermediateCert) {
    try {
      buffers.push(loadCertificate(material.intermediateCert, material.isBase64))
    } catch {
      // Intermediate cert is optional for listener startup; omit from trust store if unreadable.
    }
  }

  if (buffers.length === 0) {
    try {
      const leaf = loadCertificate(material.cert, material.isBase64)
      if (isSelfSignedCertBuffer(leaf)) {
        buffers.push(leaf)
      }
    } catch {
      // Fall through to system CAs when leaf cert cannot be loaded.
    }
  }

  return buffers.length ? buffers : undefined
}

function getListenerTrustCaBase64 (material = getListenerTlsMaterial()) {
  const buffers = getListenerTrustCaBuffers(material)
  if (!buffers?.length) {
    return ''
  }

  return buffers[0].toString('base64')
}

module.exports = {
  getListenerTlsMaterial,
  getListenerTrustCaBuffers,
  getListenerTrustCaBase64,
  isSelfSignedCertBuffer
}
