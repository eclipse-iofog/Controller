const OIDC_ENV_KEYS = [
  'AUTH_MODE',
  'CONTROLLER_PUBLIC_URL',
  'OIDC_ISSUER_URL',
  'OIDC_CLIENT_ID',
  'OIDC_CLIENT_SECRET',
  'OIDC_CONSOLE_CLIENT_ID',
  'AUTH_CONSOLE_CLIENT_ENABLED',
  'AUTH_SESSION_STORE_TYPE',
  'AUTH_SESSION_STORE_TTL_MS',
  'AUTH_SESSION_SECRET',
  'AUTH_INSECURE_ALLOW_HTTP'
]

function snapshotOidcEnv () {
  return OIDC_ENV_KEYS.reduce((env, key) => {
    env[key] = process.env[key]
    return env
  }, {})
}

function restoreOidcEnv (snapshot) {
  for (const key of OIDC_ENV_KEYS) {
    if (snapshot[key] === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = snapshot[key]
    }
  }
}

function applyOidcEnv (env = {}) {
  for (const key of OIDC_ENV_KEYS) {
    if (env[key] === undefined || env[key] === null) {
      delete process.env[key]
    } else {
      process.env[key] = env[key]
    }
  }
}

function reloadOidcModule () {
  const oidcPath = require.resolve('../../src/config/oidc')
  delete require.cache[oidcPath]
  return require('../../src/config/oidc')
}

function runMiddleware (middleware, req) {
  return new Promise((resolve, reject) => {
    const res = {
      statusCode: null,
      body: null,
      status (code) {
        this.statusCode = code
        return this
      },
      json (payload) {
        this.body = payload
        resolve({ req, res: this, nextCalled: false })
        return this
      }
    }

    middleware(req, res, (error) => {
      if (error) {
        reject(error)
        return
      }
      resolve({ req, res, nextCalled: true })
    }).catch(reject)
  })
}

module.exports = {
  OIDC_ENV_KEYS,
  snapshotOidcEnv,
  restoreOidcEnv,
  applyOidcEnv,
  reloadOidcModule,
  runMiddleware
}
