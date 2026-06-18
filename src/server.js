// Initialize everything in the correct order
const { initialize } = require('./init')
initialize().then(() => {
  const config = require('./config')
  const logger = require('./logger')
  const db = require('./data/models')
  const WebSocketServer = require('./websocket/server')

  const bodyParser = require('body-parser')
  const cookieParser = require('cookie-parser')
  const express = require('express')
  const fs = require('fs')
  const helmet = require('helmet')
  const cors = require('cors')
  const https = require('https')
  const path = require('path')
  const { renderFile } = require('ejs')
  const xss = require('xss-clean')
  const { substitutionMiddleware } = require('./helpers/template-helper')
  const multer = require('multer')
  const multerMemStorage = multer.memoryStorage()
  const uploadFile = (fileName) => multer({
    storage: multerMemStorage
  }).single(fileName)

  // Initialize session and OIDC bearer validation after config is loaded
  const session = require('express-session')
  const { initOidc, getOidcMiddleware, getAuthMode, isAuthConfigured } = require('./config/oidc.js')
  const {
    initAuthSessionStore,
    getAuthSessionStore,
    getSessionSecret,
    getSessionStoreConfig,
    resolveSessionSecret
  } = require('./config/auth-session-store.js')
  const { getPublicUrl, getConsoleUrl } = require('./config/auth-urls.js')
  const { getTrustProxySetting } = require('./config/trust-proxy.js')

  function resolveConsolePath () {
    if (process.env.EDGEOPS_CONSOLE_PATH) {
      return process.env.EDGEOPS_CONSOLE_PATH
    }
    const legacyBuildPath = path.join(__dirname, '..', 'node_modules', '@datasance', 'ecn-viewer', 'build')
    if (fs.existsSync(legacyBuildPath)) {
      return legacyBuildPath
    }
    throw new Error('EDGEOPS_CONSOLE_PATH is required (path to EdgeOps Console static build/)')
  }

  const consoleApp = express()
  const app = express()

  const trustProxy = getTrustProxySetting()
  if (trustProxy) {
    app.set('trust proxy', trustProxy === true ? 1 : trustProxy)
    consoleApp.set('trust proxy', trustProxy === true ? 1 : trustProxy)
  }

  function validateProductionPublicUrl () {
    const devMode = config.getBoolean('server.devMode', true)
    if (devMode) {
      return
    }

    const publicUrl = process.env.CONTROLLER_PUBLIC_URL || config.get('server.publicUrl')
    const insecureAllowHttp = config.getBoolean('auth.insecureAllowHttp', false)

    if (!publicUrl) {
      throw new Error('CONTROLLER_PUBLIC_URL is required in production mode')
    }

    let parsedUrl
    try {
      parsedUrl = new URL(publicUrl)
    } catch (error) {
      throw new Error('CONTROLLER_PUBLIC_URL must be a valid URL')
    }

    if (!insecureAllowHttp && parsedUrl.protocol !== 'https:') {
      throw new Error('CONTROLLER_PUBLIC_URL must use https in production unless auth.insecureAllowHttp is true')
    }
  }

  validateProductionPublicUrl()

  const devMode = config.getBoolean('server.devMode', true)
  const insecureAllowHttp = config.getBoolean('auth.insecureAllowHttp', false)

  const consoleURLForCors = getConsoleUrl()
  app.use(cors({
    origin (origin, callback) {
      if (!origin || !consoleURLForCors) {
        callback(null, true)
        return
      }
      callback(null, origin === consoleURLForCors)
    },
    credentials: true
  }))

  app.use(helmet())
  app.use(xss())

  // express logs
  // app.use(morgan('combined'));
  const sessionStoreConfig = getSessionStoreConfig()

  function skipOidcPaths (middleware) {
    return (req, res, next) => {
      if ((req.path || '').startsWith('/oidc')) {
        return next()
      }
      return middleware(req, res, next)
    }
  }

  function registerApiMiddleware () {
    app.use(skipOidcPaths(bodyParser.urlencoded({
      extended: true
    })))
    app.use(skipOidcPaths(bodyParser.json()))

    app.engine('ejs', renderFile)
    app.set('view engine', 'ejs')
    app.use(cookieParser())

    app.set('views', path.join(__dirname, 'views'))

    app.on('uncaughtException', (req, res, route, err) => {
      // TODO
    })

    app.use((req, res, next) => {
      if (req.headers && req.headers['request-id']) {
        req.id = req.headers['request-id']
        delete req.headers['request-id']
      }

      res.append('X-Timestamp', Date.now())
      next()
    })

    const { authRateLimitMiddleware } = require('./middlewares/auth-rate-limit-middleware')
    app.use(authRateLimitMiddleware)

    const eventAuditMiddleware = require('./middlewares/event-audit-middleware')
    app.use(eventAuditMiddleware)
  }

  global.appRoot = path.resolve(__dirname)

  const registerRoute = (route) => {
    if (route.method.toLowerCase() === 'ws') {
      // Handle WebSocket routes by registering them with our custom WebSocket server
      const wsServer = WebSocketServer.getInstance()
      wsServer.registerRoute(route.path, route.middleware)
    } else {
      // Handle HTTP routes
      const middlewares = [route.middleware]
      if (route.supportSubstitution) {
        middlewares.unshift(substitutionMiddleware)
      }
      if (route.fileInput) {
        middlewares.unshift(uploadFile(route.fileInput))
      }
      app[route.method.toLowerCase()](route.path, ...middlewares)
    }
  }

  const setupMiddleware = function (routeName) {
    const routes = [].concat(require(path.join(__dirname, 'routes', routeName)) || [])
    routes.forEach(registerRoute)
  }

  const jobs = []

  const setupJobs = function (file) {
    jobs.push((require(path.join(__dirname, 'jobs', file)) || []))
  }

  function registerServers (api, consoleServer) {
    process.once('SIGTERM', async function (code) {
      console.log('SIGTERM received. Shutting down.')
      await new Promise((resolve) => { api.close(resolve) })
      console.log('API Server closed.')
      await new Promise((resolve) => { consoleServer.close(resolve) })
      console.log('Console Server closed.')
      process.exit(0)
    })
  }

  function startHttpServer (apps, ports, jobs) {
    logger.info('TLS not configured, starting HTTP server.')

    const consoleServer = apps.console.listen(ports.console, function onStart (err) {
      if (err) {
        logger.error(err)
      }
      logger.info(`==> 🌎 EdgeOps Console listening on port ${ports.console}. Open up http://localhost:${ports.console}/ in your browser.`)
    })
    const apiServer = apps.api.listen(ports.api, function onStart (err) {
      if (err) {
        logger.error(err)
      }
      logger.info(`==> 🌎 API Listening on port ${ports.api}. Open up http://localhost:${ports.api}/ in your browser.`)
      jobs.forEach((job) => job.run())
    })

    // Initialize WebSocket server (use singleton to ensure routes are available)
    const wsServer = WebSocketServer.getInstance()
    wsServer.initialize(apiServer)
    logger.info(`==> 🌎 Webscoker API server listening on port ${ports.api}. Open up ws://localhost:${ports.api}/.`)
    registerServers(apiServer, consoleServer)
  }

  const { createSSLOptions } = require('./utils/ssl-utils')

  function startHttpsServer (apps, ports, sslKey, sslCert, intermedKey, jobs, isBase64 = false) {
    try {
      const sslOptions = createSSLOptions({
        key: sslKey,
        cert: sslCert,
        intermedKey,
        isBase64
      })

      const consoleServer = https.createServer(sslOptions, apps.console).listen(ports.console, function onStart (err) {
        if (err) {
          logger.error(err)
        }
        logger.info(`==> 🌎 HTTPS EdgeOps Console server listening on port ${ports.console}. Open up https://localhost:${ports.console}/ in your browser.`)
        jobs.forEach((job) => job.run())
      })

      const apiServer = https.createServer(sslOptions, apps.api).listen(ports.api, function onStart (err) {
        if (err) {
          logger.error(err)
        }
        logger.info(`==> 🌎 HTTPS API server listening on port ${ports.api}. Open up https://localhost:${ports.api}/ in your browser.`)
        jobs.forEach((job) => job.run())
      })

      // Initialize WebSocket server with SSL (use singleton to ensure routes are available)
      const wsServer = WebSocketServer.getInstance()
      wsServer.initialize(apiServer)
      logger.info(`==> 🌎 WSS API server listening on port ${ports.api}. Open up wss://localhost:${ports.api}/.`)

      registerServers(apiServer, consoleServer)
    } catch (e) {
      logger.error('Error loading TLS certificates. Please check your configuration.')
    }
  }

  const apiPort = process.env.API_PORT || config.get('server.port')
  const consolePort = process.env.CONSOLE_PORT || config.get('console.port')
  const controlPlane = process.env.CONTROL_PLANE || config.get('app.ControlPlane')
  const publicUrl = getPublicUrl()
  const consoleURL = getConsoleUrl()
  const consolePath = resolveConsolePath()

  // File-based TLS configuration
  const tlsKey = process.env.TLS_PATH_KEY || config.get('server.tls.path.key')
  const tlsCert = process.env.TLS_PATH_CERT || config.get('server.tls.path.cert')
  const intermedKey = process.env.TLS_PATH_INTERMEDIATE_CERT || config.get('server.tls.path.intermediateCert')

  // Base64 TLS configuration
  const tlsKeyBase64 = process.env.TLS_BASE64_KEY || config.get('server.tls.base64.key')
  const tlsCertBase64 = process.env.TLS_BASE64_CERT || config.get('server.tls.base64.cert')
  const intermedKeyBase64 = process.env.TLS_BASE64_INTERMEDIATE_CERT || config.get('server.tls.base64.intermediateCert')

  const hasFileBasedTLS = !devMode && tlsKey && tlsCert
  const hasBase64TLS = !devMode && tlsKeyBase64 && tlsCertBase64

  consoleApp.use(express.static(consolePath, { index: 'index.html' }))
  consoleApp.get('*', (req, res, next) => {
    if (path.extname(req.path)) {
      return next()
    }
    res.sendFile(path.join(consolePath, 'index.html'), (error) => {
      if (error) {
        next(error)
      }
    })
  })

  const isDaemon = process.argv[process.argv.length - 1] === 'daemonize2'

  const initState = async () => {
    if (!isDaemon) {
      // InitDB
      try {
        await db.initDB(true)
      } catch (err) {
        logger.error('Unable to initialize the database. Error: ' + err)
        process.exit(1)
      }

      // Store PID to let deamon know we are running.
      jobs.push({
        run: () => {
          const pidFile = path.join((process.env.PID_BASE || __dirname), 'iofog-controller.pid')
          logger.info(`==> PID file: ${pidFile}`)
          fs.writeFileSync(pidFile, process.pid.toString())
        }
      })
    }

    if (getAuthMode() === 'embedded' && isAuthConfigured()) {
      const { runBootstrap } = require('./services/auth-bootstrap-service')
      await runBootstrap()
      const { initEmbeddedIssuer } = require('./config/embedded-oidc.js')
      await initEmbeddedIssuer(app, { db })
    }

    fs.readdirSync(path.join(__dirname, 'routes'))
      .forEach(setupMiddleware)

    fs.readdirSync(path.join(__dirname, 'jobs'))
      .filter((file) => {
        return (file.indexOf('.') !== 0) && (file.slice(-3) === '.js')
      })
      .forEach(setupJobs)

    // Set up controller-config.js for EdgeOps Console
    const consoleConfigFilePath = path.join(consolePath, 'controller-config.js')
    const consoleConfig = {
      apiPort,
      auth: {
        mode: getAuthMode(),
        loginUrl: '/api/v3/user/login',
        refreshUrl: '/api/v3/user/refresh',
        logoutUrl: '/api/v3/user/logout',
        profileUrl: '/api/v3/user/profile',
        changePasswordUrl: '/api/v3/user/change-password',
        oauthAuthorizeUrl: '/api/v3/user/oauth/authorize',
        oauthInteractionUrl: '/login/oauth'
      }
    }
    if (publicUrl) {
      consoleConfig.publicUrl = publicUrl
    }
    consoleConfig.consoleUrl = consoleURL || publicUrl || `http://localhost:${consolePort}`
    if (controlPlane) {
      consoleConfig.controlPlane = controlPlane
    }
    const consoleConfigScript = `
      window.controllerConfig = ${JSON.stringify(consoleConfig)}
    `
    fs.writeFileSync(consoleConfigFilePath, consoleConfigScript)
  }

  resolveSessionSecret()
    .then(() => {
      initOidc()
      initAuthSessionStore()

      app.use(session({
        secret: getSessionSecret(),
        resave: false,
        saveUninitialized: false,
        store: getAuthSessionStore(),
        cookie: {
          maxAge: sessionStoreConfig.ttlMs,
          sameSite: 'lax',
          secure: !devMode && !insecureAllowHttp
        }
      }))
      app.use(getOidcMiddleware())
      registerApiMiddleware()

      return initState()
    })
    .then(() => {
      if (hasFileBasedTLS) {
        startHttpsServer(
          { api: app, console: consoleApp },
          { api: apiPort, console: consolePort },
          tlsKey,
          tlsCert,
          intermedKey,
          jobs,
          false
        )
      } else if (hasBase64TLS) {
        startHttpsServer(
          { api: app, console: consoleApp },
          { api: apiPort, console: consolePort },
          tlsKeyBase64,
          tlsCertBase64,
          intermedKeyBase64,
          jobs,
          true
        )
      } else {
        startHttpServer(
          { api: app, console: consoleApp },
          { api: apiPort, console: consolePort },
          jobs
        )
      }
    })
})
