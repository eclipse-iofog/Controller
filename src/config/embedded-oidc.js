'use strict'

const crypto = require('crypto')
const { Provider } = require('oidc-provider')
const { generateKeyPair, exportJWK } = require('jose')
const config = require('./index')
const logger = require('../logger')
const secretHelper = require('../helpers/secret-helper')
const { getOidcSettings } = require('./oidc')
const { createOidcProviderAdapterFactory } = require('../data/adapters/oidc-provider-adapter')

const DEFAULT_VIEWER_CLIENT_ID = 'ecn-viewer'
const CONTROLLER_CLIENT_ID = 'controller'

let providerInstance = null

function getPublicUrl () {
  return (process.env.CONTROLLER_PUBLIC_URL || config.get('server.publicUrl') || '').replace(/\/$/, '')
}

function isViewerClientEnabled () {
  const envValue = process.env.AUTH_VIEWER_CLIENT_ENABLED
  if (envValue !== undefined && envValue !== null && envValue !== '') {
    return envValue === 'true' || envValue === '1'
  }
  return config.get('auth.viewerClient.enabled', false) === true
}

function getViewerClientId () {
  return process.env.OIDC_VIEWER_CLIENT_ID ||
    config.get('auth.viewerClient.id') ||
    config.get('auth.viewerClient') ||
    DEFAULT_VIEWER_CLIENT_ID
}

function generateClientSecret () {
  return crypto.randomBytes(32).toString('base64url')
}

function getCookieKeys () {
  const configured = process.env.OIDC_COOKIE_KEYS || config.get('auth.cookieKeys')
  if (Array.isArray(configured)) {
    return configured.filter(Boolean)
  }
  if (typeof configured === 'string' && configured.trim()) {
    return configured.split(',').map((value) => value.trim()).filter(Boolean)
  }
  return ['controller-embedded-oidc-cookie-key']
}

function getTrustProxySetting () {
  const trustProxy = process.env.TRUST_PROXY || config.get('server.trustProxy', false)
  if (trustProxy === true || trustProxy === 'true' || trustProxy === 1 || trustProxy === '1') {
    return true
  }
  return trustProxy || false
}

async function resolveStoredSecret (secretRef, secretName, secretType) {
  if (!secretRef) {
    return null
  }

  if (secretHelper.isVaultReference(secretRef)) {
    const data = await secretHelper.decryptSecret(secretRef, secretName, secretType)
    return data.secret || data.client_secret || data.value || null
  }

  try {
    const data = await secretHelper.decryptSecret(secretRef, secretName, secretType)
    return data.secret || data.client_secret || data.value || null
  } catch (error) {
    return secretRef
  }
}

async function persistClientSecret (db, clientId, secret) {
  const secretRef = await secretHelper.encryptSecret({ secret }, `oidc-client-${clientId}`, 'oidc-client')
  const existing = await db.AuthOidcClient.findOne({ where: { clientId } })
  if (existing) {
    await existing.update({ secretRef })
    return existing
  }

  return db.AuthOidcClient.create({
    clientId,
    secretRef,
    clientType: 'confidential'
  })
}

async function ensureConfidentialClientMetadata (db) {
  const { clientId, clientSecret: envSecret } = getOidcSettings()
  const resolvedClientId = clientId || CONTROLLER_CLIENT_ID
  const publicUrl = getPublicUrl()
  let clientRow = await db.AuthOidcClient.findOne({ where: { clientId: resolvedClientId } })

  let secret = envSecret || null
  if (!secret && clientRow && clientRow.secretRef) {
    secret = await resolveStoredSecret(clientRow.secretRef, `oidc-client-${resolvedClientId}`, 'oidc-client')
  }

  if (!secret) {
    secret = generateClientSecret()
    clientRow = await persistClientSecret(db, resolvedClientId, secret)
    logger.info(`Generated embedded OIDC client secret for "${resolvedClientId}"`)
  } else if (!clientRow) {
    let secretRef = envSecret
    if (!secretRef) {
      secretRef = await secretHelper.encryptSecret({ secret }, `oidc-client-${resolvedClientId}`, 'oidc-client')
    }
    clientRow = await db.AuthOidcClient.create({
      clientId: resolvedClientId,
      secretRef,
      clientType: 'confidential'
    })
  }

  return {
    client_id: resolvedClientId,
    client_secret: secret,
    grant_types: ['authorization_code', 'refresh_token', 'client_credentials'],
    response_types: ['code'],
    token_endpoint_auth_method: 'client_secret_basic',
    redirect_uris: [`${publicUrl}/api/v3/user/oauth/callback`]
  }
}

async function ensureViewerClientMetadata (db) {
  if (!isViewerClientEnabled()) {
    return null
  }

  const clientId = getViewerClientId()
  let clientRow = await db.AuthOidcClient.findOne({ where: { clientId } })
  if (!clientRow) {
    clientRow = await db.AuthOidcClient.create({
      clientId,
      clientType: 'public'
    })
  }

  const publicUrl = getPublicUrl()
  return {
    client_id: clientId,
    client_secret: undefined,
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    token_endpoint_auth_method: 'none',
    redirect_uris: [`${publicUrl}/`]
  }
}

async function loadPrivateJwk (row) {
  if (row.vaultRef) {
    const data = await secretHelper.decryptSecret(row.vaultRef, `oidc-key-${row.kid}`, 'oidc-key')
    return data.jwk
  }

  if (row.keyMaterialEncrypted) {
    const data = await secretHelper.decryptSecret(row.keyMaterialEncrypted, `oidc-key-${row.kid}`, 'oidc-key')
    return data.jwk
  }

  return null
}

async function ensureSigningJwks (db) {
  const activeKeys = await db.AuthOidcKey.findAll({
    where: { active: true },
    order: [['id', 'ASC']]
  })

  const keys = []
  for (const row of activeKeys) {
    const privateJwk = await loadPrivateJwk(row)
    if (!privateJwk) {
      continue
    }
    keys.push(privateJwk)
  }

  if (keys.length > 0) {
    return { keys }
  }

  const { publicKey, privateKey } = await generateKeyPair('RS256')
  const publicJwk = await exportJWK(publicKey)
  const privateJwk = await exportJWK(privateKey)
  const kid = crypto.randomUUID()

  publicJwk.kid = kid
  publicJwk.alg = 'RS256'
  publicJwk.use = 'sig'
  privateJwk.kid = kid
  privateJwk.alg = 'RS256'
  privateJwk.use = 'sig'

  const keyMaterialEncrypted = await secretHelper.encryptSecret({ jwk: privateJwk }, `oidc-key-${kid}`, 'oidc-key')
  await db.AuthOidcKey.create({
    kid,
    keyMaterialEncrypted,
    active: true
  })

  logger.info('Generated embedded OIDC signing key (JWKS)')
  return { keys: [privateJwk] }
}

async function loadTokenPolicy (db) {
  const policy = await db.AuthPolicy.findByPk(1)
  return {
    accessTokenTtlSeconds: (policy && policy.accessTokenTtlSeconds) || 900,
    refreshTokenTtlSeconds: (policy && policy.refreshTokenTtlSeconds) || 604800
  }
}

async function buildProviderConfiguration (db) {
  const clients = [await ensureConfidentialClientMetadata(db)]
  const viewerClient = await ensureViewerClientMetadata(db)
  if (viewerClient) {
    clients.push(viewerClient)
  }

  const tokenPolicy = await loadTokenPolicy(db)
  const trustProxy = getTrustProxySetting()

  return {
    adapter: createOidcProviderAdapterFactory(() => db.AuthOidcProviderState),
    clients,
    jwks: await ensureSigningJwks(db),
    findAccount: async (ctx, id) => {
      const user = await db.AuthUser.findByPk(id, {
        include: [{
          model: db.AuthGroup,
          as: 'groups',
          through: { attributes: [] }
        }]
      })
      if (!user || user.deletedAt) {
        return undefined
      }

      const groupNames = (user.groups || []).map((group) => group.name)

      return {
        accountId: id,
        async claims () {
          return {
            sub: id,
            email: user.email,
            preferred_username: user.email,
            groups: groupNames
          }
        }
      }
    },
    cookies: {
      keys: getCookieKeys()
    },
    features: {
      devInteractions: { enabled: false },
      revocation: { enabled: true },
      registration: { enabled: false },
      deviceFlow: { enabled: false },
      introspection: { enabled: false }
    },
    routes: {
      revocation: '/revoke'
    },
    scopes: ['openid', 'profile', 'email', 'groups'],
    claims: {
      openid: ['sub'],
      email: ['email'],
      profile: ['preferred_username'],
      groups: ['groups']
    },
    pkce: {
      required: (ctx, client) => client.tokenEndpointAuthMethod === 'none'
    },
    proxy: trustProxy,
    ttl: {
      AccessToken: tokenPolicy.accessTokenTtlSeconds,
      RefreshToken: tokenPolicy.refreshTokenTtlSeconds
    }
  }
}

async function initEmbeddedIssuer (app, options = {}) {
  if (providerInstance) {
    return providerInstance
  }

  const db = options.db || require('../data/models')
  if (!db.AuthOidcKey || !db.AuthOidcClient || !db.AuthOidcProviderState) {
    throw new Error('Embedded OIDC issuer requires auth models to be initialized')
  }

  const issuer = getOidcSettings().issuerUrl
  const configuration = await buildProviderConfiguration(db)
  const provider = new Provider(issuer, configuration)

  app.use('/oidc', provider.callback())
  providerInstance = provider
  logger.info(`Embedded OIDC issuer mounted at /oidc (issuer: ${issuer})`)

  return provider
}

function getEmbeddedProvider () {
  return providerInstance
}

function resetEmbeddedIssuerForTests () {
  providerInstance = null
}

module.exports = {
  initEmbeddedIssuer,
  getEmbeddedProvider,
  resetEmbeddedIssuerForTests
}
