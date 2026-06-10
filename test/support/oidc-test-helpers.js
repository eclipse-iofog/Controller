const OIDC_ENV_KEYS = [
  'OIDC_ISSUER_URL',
  'OIDC_CLIENT_ID',
  'OIDC_CLIENT_SECRET',
  'OIDC_VIEWER_CLIENT_ID'
]

let savedTlsRejectUnauthorized

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

function enableMockOidcTls () {
  savedTlsRejectUnauthorized = process.env.NODE_TLS_REJECT_UNAUTHORIZED
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
}

function restoreMockOidcTls () {
  if (savedTlsRejectUnauthorized === undefined) {
    delete process.env.NODE_TLS_REJECT_UNAUTHORIZED
  } else {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = savedTlsRejectUnauthorized
  }
  savedTlsRejectUnauthorized = undefined
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
  enableMockOidcTls,
  restoreMockOidcTls,
  reloadOidcModule,
  runMiddleware
}
