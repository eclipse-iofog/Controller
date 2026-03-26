/*
 *  *******************************************************************************
 *  * Copyright (c) 2023 Contributors to the Eclipse ioFog Project
 *  *
 *  * This program and the accompanying materials are made available under the
 *  * terms of the Eclipse Public License v. 2.0 which is available at
 *  * http://www.eclipse.org/legal/epl-2.0
 *  *
 *  * SPDX-License-Identifier: EPL-2.0
 *  *******************************************************************************
 *
 */

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
  const ecnViewer = process.env.ECN_VIEWER_PATH ? require(`${process.env.ECN_VIEWER_PATH}/package/index.js`) : require('@eclipse-iofog/ecn-viewer')
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

  // Initialize session and Keycloak after config is loaded
  const session = require('express-session')
  const { initKeycloak, getMemoryStore } = require('./config/keycloak.js')
  const memoryStore = getMemoryStore()
  const keycloak = initKeycloak()

  const viewerApp = express()
  const app = express()

  app.use(cors())

  app.use(helmet())
  app.use(xss())

  // express logs
  // app.use(morgan('combined'));
  app.use(session({
    secret: 'iofog-controller',
    resave: false,
    saveUninitialized: true,
    store: memoryStore
  }))
  app.use(keycloak.middleware())
  app.use(bodyParser.urlencoded({
    extended: true
  }))
  app.use(bodyParser.json())

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

  // Event audit middleware - tracks non-GET operations
  // Must be after authentication middleware but before route handlers
  const eventAuditMiddleware = require('./middlewares/event-audit-middleware')
  app.use(eventAuditMiddleware)

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

  fs.readdirSync(path.join(__dirname, 'routes'))
    .forEach(setupMiddleware)

  const jobs = []

  const setupJobs = function (file) {
    jobs.push((require(path.join(__dirname, 'jobs', file)) || []))
  }

  fs.readdirSync(path.join(__dirname, 'jobs'))
    .filter((file) => {
      return (file.indexOf('.') !== 0) && (file.slice(-3) === '.js')
    })
    .forEach(setupJobs)

  function registerServers (api, viewer) {
    process.once('SIGTERM', async function (code) {
      console.log('SIGTERM received. Shutting down.')
      await new Promise((resolve) => { api.close(resolve) })
      console.log('API Server closed.')
      await new Promise((resolve) => { viewer.close(resolve) })
      console.log('Viewer Server closed.')
      process.exit(0)
    })
  }

  function startHttpServer (apps, ports, jobs) {
    logger.info('SSL not configured, starting HTTP server.')

    const viewerServer = apps.viewer.listen(ports.viewer, function onStart (err) {
      if (err) {
        logger.error(err)
      }
      logger.info(`==> 🌎 Viewer listening on port ${ports.viewer}. Open up http://localhost:${ports.viewer}/ in your browser.`)
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
    registerServers(apiServer, viewerServer)
  }

  const { createSSLOptions } = require('./utils/ssl-utils')

  function startHttpsServer (apps, ports, sslKey, sslCert, intermedKey, jobs, isBase64 = false) {
    try {
      const sslOptions = createSSLOptions({
        key: sslKey,
        cert: sslCert,
        intermedKey: intermedKey,
        isBase64: isBase64
      })

      const viewerServer = https.createServer(sslOptions, apps.viewer).listen(ports.viewer, function onStart (err) {
        if (err) {
          logger.error(err)
        }
        logger.info(`==> 🌎 HTTPS Viewer server listening on port ${ports.viewer}. Open up https://localhost:${ports.viewer}/ in your browser.`)
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

      registerServers(apiServer, viewerServer)
    } catch (e) {
      logger.error('Error loading SSL certificates. Please check your configuration.')
    }
  }

  const devMode = process.env.DEV_MODE || config.get('server.devMode')
  const apiPort = process.env.API_PORT || config.get('server.port')
  const viewerPort = process.env.VIEWER_PORT || config.get('viewer.port')
  const viewerURL = process.env.VIEWER_URL || config.get('viewer.url')
  const controlPlane = process.env.CONTROL_PLANE || config.get('app.ControlPlane')

  // File-based SSL configuration
  const sslKey = process.env.SSL_PATH_KEY || config.get('server.ssl.path.key')
  const sslCert = process.env.SSL_PATH_CERT || config.get('server.ssl.path.cert')
  const intermedKey = process.env.SSL_PATH_INTERMEDIATE_CERT || config.get('server.ssl.path.intermediateCert')

  // Base64 SSL configuration
  const sslKeyBase64 = process.env.SSL_BASE64_KEY || config.get('server.ssl.base64.key')
  const sslCertBase64 = process.env.SSL_BASE64_CERT || config.get('server.ssl.base64.cert')
  const intermedKeyBase64 = process.env.SSL_BASE64_INTERMEDIATE_CERT || config.get('server.ssl.base64.intermediateCert')

  const hasFileBasedSSL = !devMode && sslKey && sslCert
  const hasBase64SSL = !devMode && sslKeyBase64 && sslCertBase64

  const kcRealm = process.env.KC_REALM || config.get('auth.realm')
  const kcURL = process.env.KC_URL || config.get('auth.url')
  const kcClient = process.env.KC_VIEWER_CLIENT || config.get('auth.viewerClient')

  viewerApp.use('/', ecnViewer.middleware(express))

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
    // Set up controller-config.js for ECN Viewer
    const ecnViewerControllerConfigFilePath = path.join(__dirname, '..', 'node_modules', '@eclipse-iofog', 'ecn-viewer', 'build', 'controller-config.js')
    const ecnViewerControllerConfig = {
      port: apiPort,
      user: {},
      controllerDevMode: devMode,
      keycloakUrl: kcURL,
      keycloakRealm: kcRealm,
      keycloakClientId: kcClient
    }
    if (viewerURL) {
      ecnViewerControllerConfig.url = viewerURL
    }
    if (controlPlane) {
      ecnViewerControllerConfig.controlPlane = controlPlane
    }
    const ecnViewerConfigScript = `
      window.controllerConfig = ${JSON.stringify(ecnViewerControllerConfig)}
    `
    fs.writeFileSync(ecnViewerControllerConfigFilePath, ecnViewerConfigScript)
  }

  initState()
    .then(() => {
      if (hasFileBasedSSL) {
        startHttpsServer(
          { api: app, viewer: viewerApp },
          { api: apiPort, viewer: viewerPort },
          sslKey,
          sslCert,
          intermedKey,
          jobs,
          false
        )
      } else if (hasBase64SSL) {
        startHttpsServer(
          { api: app, viewer: viewerApp },
          { api: apiPort, viewer: viewerPort },
          sslKeyBase64,
          sslCertBase64,
          intermedKeyBase64,
          jobs,
          true
        )
      } else {
        startHttpServer(
          { api: app, viewer: viewerApp },
          { api: apiPort, viewer: viewerPort },
          jobs
        )
      }
    })
})
