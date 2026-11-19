const https = require('https')
const tls = require('tls')
const { X509Certificate } = require('crypto')
const { Agent, buildConnector, fetch: undiciFetch } = require('undici')
const config = require('./index')
const { getPublicUrl } = require('./auth-urls')
const { loadCertificate } = require('../utils/ssl-utils')
const { getListenerTlsMaterial } = require('../utils/tls-config')

const LOOPBACK_HOST = '127.0.0.1'

let cachedExternalFetch
let cachedExternalCaKey
const loopbackAgents = new Map()

function resetEmbeddedOidcFetchForTests () {
  for (const agent of loopbackAgents.values()) {
    try {
      agent.destroy()
    } catch {
      // Agent cleanup is best-effort between tests.
    }
  }
  loopbackAgents.clear()
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

function getApiListenPort () {
  return String(process.env.API_PORT || config.get('server.port'))
}

function embeddedIssuerUrl () {
  const publicUrl = getPublicUrl()
  if (!publicUrl) {
    return null
  }
  try {
    return new URL(`${publicUrl}/oidc`)
  } catch {
    return null
  }
}

function isEmbeddedIssuerUrl (target, issuer) {
  const issuerPath = issuer.pathname.replace(/\/$/, '')
  return target.origin === issuer.origin &&
    (target.pathname === issuerPath || target.pathname.startsWith(`${issuerPath}/`))
}

// Browser and discovery URLs stay on CONTROLLER_PUBLIC_URL. This process dials
// its own listener instead, so embedded token and JWKS calls do not hairpin
// through ingress TLS.
function rewriteEmbeddedBackchannelUrl (input) {
  const target = new URL(typeof input === 'string' ? input : String(input))
  const issuer = embeddedIssuerUrl()
  if (!issuer || !isEmbeddedIssuerUrl(target, issuer)) {
    return { href: target.href, local: false, tls: false }
  }

  const material = getListenerTlsMaterial()
  target.protocol = material.enabled ? 'https:' : 'http:'
  target.hostname = LOOPBACK_HOST
  target.port = getApiListenPort()
  return { href: target.href, local: true, tls: material.enabled === true }
}

function readListenerLeafFingerprint (material) {
  const leaf = loadCertificate(material.cert, material.isBase64)
  return new X509Certificate(leaf).fingerprint256
}

function createLoopbackTlsAgent (expectedFingerprint) {
  const connector = buildConnector({ rejectUnauthorized: false })
  return new Agent({
    connect (opts, callback) {
      const hostname = opts.hostname || opts.host
      if (hostname !== LOOPBACK_HOST) {
        callback(new Error('embedded loopback agent refused a non-local connection'))
        return
      }

      connector({ ...opts, rejectUnauthorized: false }, (err, socket) => {
        if (err) {
          callback(err)
          return
        }

        let peerFingerprint = ''
        try {
          peerFingerprint = socket.getPeerCertificate().fingerprint256 || ''
        } catch (error) {
          socket.destroy()
          callback(error)
          return
        }

        if (!peerFingerprint || peerFingerprint !== expectedFingerprint) {
          socket.destroy()
          callback(new Error('loopback certificate does not match the listener certificate'))
          return
        }

        callback(null, socket)
      })
    }
  })
}

function getLoopbackAgent (fingerprint) {
  let agent = loopbackAgents.get(fingerprint)
  if (!agent) {
    agent = createLoopbackTlsAgent(fingerprint)
    loopbackAgents.set(fingerprint, agent)
  }
  return agent
}

function createEmbeddedOidcFetch () {
  return function embeddedOidcFetch (url, init) {
    const rewritten = rewriteEmbeddedBackchannelUrl(url)
    if (!rewritten.local || !rewritten.tls) {
      return undiciFetch(rewritten.href, init)
    }

    const material = getListenerTlsMaterial()
    let fingerprint
    try {
      fingerprint = readListenerLeafFingerprint(material)
    } catch (error) {
      return Promise.reject(error)
    }

    return undiciFetch(rewritten.href, {
      ...init,
      dispatcher: getLoopbackAgent(fingerprint)
    })
  }
}

module.exports = {
  createEmbeddedOidcFetch,
  rewriteEmbeddedBackchannelUrl,
  resetEmbeddedOidcFetchForTests,
  hasExternalIssuerCaConfig,
  getExternalIssuerCaBuffer,
  createExternalOidcFetch,
  createExternalIssuerHttpsAgent,
  resetExternalOidcFetchForTests
}
