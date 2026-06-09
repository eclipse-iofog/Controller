const session = require('express-session')
const Keycloak = require('keycloak-connect')
const config = require('./index')
const logger = require('../logger')

// Mock Keycloak implementation for development mode
class MockKeycloak {
  constructor () {
    this.protect = (roles) => {
      return async (req, res, next) => {
        // In dev mode, we just add mock user info to the request
        req.kauth = {
          grant: {
            access_token: {
              content: {
                preferred_username: 'dev-user',
                realm_access: {
                  roles: ['SRE', 'Developer', 'Viewer']
                }
              }
            }
          }
        }
        return next()
      }
    }

    // Add middleware method to match real Keycloak interface
    this.middleware = () => {
      return (req, res, next) => {
        // In dev mode, we just pass through the middleware
        return next()
      }
    }
  }
}

const keycloakConfig = {
  realm: process.env.KC_REALM || config.get('auth.realm'),
  'realm-public-key': process.env.KC_REALM_KEY || config.get('auth.realmKey'),
  'auth-server-url': process.env.KC_URL || config.get('auth.url'),
  'ssl-required': process.env.KC_SSL_REQ || config.get('auth.sslRequired'),
  resource: process.env.KC_CLIENT || config.get('auth.client.id'),
  'bearer-only': true,
  'verify-token-audience': true,
  credentials: {
    secret: process.env.KC_CLIENT_SECRET || config.get('auth.client.secret')
  },
  'use-resource-role-mappings': true,
  'confidential-port': 0
}

let keycloak
let memoryStore

function isAuthConfigured () {
  const requiredConfigs = [
    'auth.realm',
    'auth.realmKey',
    'auth.url',
    'auth.client.id',
    'auth.client.secret'
  ]
  return requiredConfigs.every(configKey => {
    const value = config.get(configKey)
    return value !== undefined && value !== null && value !== ''
  })
}

function initKeycloak () {
  if (keycloak) {
    return keycloak
  }

  const isDevMode = config.get('server.devMode', true)
  const hasAuthConfig = isAuthConfigured()

  if (!hasAuthConfig && isDevMode) {
    // Initialize mock Keycloak for development
    keycloak = new MockKeycloak()
    logger.warn('Keycloak initialized in development mode (no auth configuration)')
    logger.warn('WARNING: All routes are unprotected in this mode')
  } else if (!hasAuthConfig) {
    // Throw error in production if auth not configured
    const error = new Error('Auth configuration required in production mode')
    logger.error('Failed to initialize Keycloak:', error)
    throw error
  } else {
    // Initialize real Keycloak
    try {
      memoryStore = new session.MemoryStore()
      keycloak = new Keycloak({ store: memoryStore }, keycloakConfig)
      logger.info('Keycloak initialized successfully with auth configuration')
    } catch (error) {
      logger.error('Error initializing Keycloak:', error)
      throw error
    }
  }

  return keycloak
}

function getKeycloak () {
  if (keycloak) {
    return keycloak
  }
}

function getMemoryStore () {
  if (memoryStore) {
    return memoryStore
  }
}

module.exports = {
  initKeycloak,
  getMemoryStore,
  getKeycloak
}
