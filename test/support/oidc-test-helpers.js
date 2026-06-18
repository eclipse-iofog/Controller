const { parseBoolean } = require('../../src/config/parse-boolean')

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

function resolveOidcConfigOverrides (env = {}) {
  const overrides = {}
  const booleanOverrides = {}

  for (const key of OIDC_ENV_KEYS) {
    const value = env[key]
    const isCleared = value === undefined || value === null

    switch (key) {
      case 'CONTROLLER_PUBLIC_URL':
        overrides['server.publicUrl'] = isCleared ? '' : value
        break
      case 'AUTH_MODE':
        if (!isCleared) {
          overrides['auth.mode'] = value
        }
        break
      case 'OIDC_ISSUER_URL':
        overrides['auth.issuerUrl'] = isCleared ? '' : value
        break
      case 'OIDC_CLIENT_ID':
        overrides['auth.client.id'] = isCleared ? '' : value
        break
      case 'OIDC_CLIENT_SECRET':
        overrides['auth.client.secret'] = isCleared ? '' : value
        break
      case 'OIDC_CONSOLE_CLIENT_ID':
        if (!isCleared) {
          overrides['auth.consoleClient.id'] = value
          overrides['auth.consoleClient'] = value
        }
        break
      case 'AUTH_CONSOLE_CLIENT_ENABLED':
        booleanOverrides['auth.consoleClient.enabled'] = isCleared
          ? false
          : parseBoolean(value, false)
        break
      case 'AUTH_INSECURE_ALLOW_HTTP':
        booleanOverrides['auth.insecureAllowHttp'] = isCleared
          ? false
          : parseBoolean(value, false)
        break
      default:
        break
    }
  }

  return { overrides, booleanOverrides }
}

function installOidcConfigStubs (sandbox, env = {}, extras = {}) {
  const config = require('../../src/config')
  const originalGet = config.get.bind(config)
  const originalGetBoolean = config.getBoolean.bind(config)
  const { overrides, booleanOverrides } = resolveOidcConfigOverrides(env)
  const extraGet = extras.get || {}
  const extraGetBoolean = extras.getBoolean || {}

  sandbox.stub(config, 'get').callsFake((key, defaultValue) => {
    if (Object.prototype.hasOwnProperty.call(extraGet, key)) {
      return extraGet[key]
    }
    if (Object.prototype.hasOwnProperty.call(overrides, key)) {
      return overrides[key]
    }
    return originalGet(key, defaultValue)
  })

  sandbox.stub(config, 'getBoolean').callsFake((key, defaultValue = false) => {
    if (Object.prototype.hasOwnProperty.call(extraGetBoolean, key)) {
      return extraGetBoolean[key]
    }
    if (Object.prototype.hasOwnProperty.call(booleanOverrides, key)) {
      return booleanOverrides[key]
    }
    return originalGetBoolean(key, defaultValue)
  })
}

function applyOidcEnv (env = {}, options = {}) {
  for (const key of OIDC_ENV_KEYS) {
    if (env[key] === undefined || env[key] === null) {
      delete process.env[key]
    } else {
      process.env[key] = env[key]
    }
  }

  if (options.sandbox) {
    installOidcConfigStubs(options.sandbox, env, options.configExtras || {})
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
  resolveOidcConfigOverrides,
  installOidcConfigStubs,
  applyOidcEnv,
  reloadOidcModule,
  runMiddleware
}
