'use strict'

const crypto = require('crypto')
const { Provider, interactionPolicy } = require('oidc-provider')
const { generateKeyPair, exportJWK } = require('jose')
const config = require('./index')
const logger = require('../logger')
const secretHelper = require('../helpers/secret-helper')
const {
  resolveConfidentialClientSecret
} = require('./embedded-oidc-client-secret')
const { getOidcSettings } = require('./oidc')
const { createOidcProviderAdapterFactory } = require('../data/adapters/oidc-provider-adapter')
const { buildUserAccessClaims } = require('../services/auth-token-service')
const { loadOidcProviderTtls } = require('./auth-oidc-ttl')
const { getPublicUrl, getConsoleUrl } = require('./auth-urls')
const { getTrustProxySetting } = require('./trust-proxy')

const DEFAULT_CONSOLE_CLIENT_ID = 'ecn-viewer'

let providerInstance = null

function getOauthInteractionPath () {
  return config.get('auth.oauthInteractionUrl') || '/login/oauth'
}

function buildInteractionRedirectUrl (interactionUid) {
  const consoleUrl = getConsoleUrl()
  if (!consoleUrl) {
    throw new Error('CONTROLLER_PUBLIC_URL or CONSOLE_URL is required for embedded OAuth BFF interactions')
  }
  const interactionPath = getOauthInteractionPath()
  const normalizedPath = interactionPath.startsWith('/') ? interactionPath : `/${interactionPath}`
  return `${consoleUrl}${normalizedPath}?interaction=${encodeURIComponent(interactionUid)}`
}

function buildInteractionPolicy () {
  const policy = interactionPolicy.base()
  policy.remove('consent')
  return policy
}

function isConsoleClientEnabled () {
  return config.getBoolean('auth.consoleClient.enabled', false)
}

function getConsoleClientId () {
  return process.env.OIDC_CONSOLE_CLIENT_ID ||
    config.get('auth.consoleClient.id') ||
    config.get('auth.consoleClient') ||
    DEFAULT_CONSOLE_CLIENT_ID
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

async function ensureConfidentialClientMetadata (db) {
  const publicUrl = getPublicUrl()
  const { clientId, clientSecret } = await resolveConfidentialClientSecret(db, { createIfMissing: true })

  return {
    client_id: clientId,
    client_secret: clientSecret,
    grant_types: ['authorization_code'],
    response_types: ['code'],
    token_endpoint_auth_method: 'client_secret_basic',
    redirect_uris: [`${publicUrl}/api/v3/user/oauth/callback`]
  }
}

async function ensureConsoleClientMetadata (db) {
  if (!isConsoleClientEnabled()) {
    return null
  }

  const clientId = getConsoleClientId()
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
    grant_types: ['authorization_code'],
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

async function buildProviderConfiguration (db) {
  const clients = [await ensureConfidentialClientMetadata(db)]
  const consoleClient = await ensureConsoleClientMetadata(db)
  if (consoleClient) {
    clients.push(consoleClient)
  }

  const ttlPolicy = await loadOidcProviderTtls(db)
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
            ...buildUserAccessClaims(user, groupNames)
          }
        }
      }
    },
    cookies: {
      keys: getCookieKeys()
    },
    interactions: {
      policy: buildInteractionPolicy(),
      url (ctx, interaction) {
        return buildInteractionRedirectUrl(interaction.uid)
      }
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
      AccessToken: ttlPolicy.accessTokenTtlSeconds,
      RefreshToken: ttlPolicy.refreshTokenTtlSeconds,
      IdToken: ttlPolicy.idTokenTtlSeconds,
      Interaction: ttlPolicy.interactionTtlSeconds,
      Grant: ttlPolicy.grantTtlSeconds,
      Session: ttlPolicy.sessionTtlSeconds
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

function getEmbeddedIssuerMetadata (issuerUrl) {
  const base = issuerUrl.replace(/\/$/, '')
  return {
    issuer: base,
    authorization_endpoint: `${base}/auth`,
    token_endpoint: `${base}/token`,
    jwks_uri: `${base}/jwks`,
    userinfo_endpoint: `${base}/me`,
    end_session_endpoint: `${base}/session/end`,
    revocation_endpoint: `${base}/revoke`,
    pushed_authorization_request_endpoint: `${base}/request`,
    response_types_supported: ['code id_token', 'code', 'id_token', 'none'],
    grant_types_supported: ['implicit', 'authorization_code'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: [
      'client_secret_basic',
      'client_secret_jwt',
      'client_secret_post',
      'private_key_jwt',
      'none'
    ],
    id_token_signing_alg_values_supported: ['RS256'],
    subject_types_supported: ['public'],
    scopes_supported: ['openid', 'profile', 'email', 'groups']
  }
}

module.exports = {
  initEmbeddedIssuer,
  getEmbeddedProvider,
  resetEmbeddedIssuerForTests,
  getOauthInteractionPath,
  buildInteractionRedirectUrl,
  getEmbeddedIssuerMetadata
}
