/*
 *  *******************************************************************************
 *  * Copyright (c) 2020 Edgeworx, Inc.
 *  *
 *  * This program and the accompanying materials are made available under the
 *  * terms of the Eclipse Public License v. 2.0 which is available at
 *  * http://www.eclipse.org/legal/epl-2.0
 *  *
 *  * SPDX-License-Identifier: EPL-2.0
 *  *******************************************************************************
 *
 */

const config = require('./config')
const logger = require('./logger')
const db = require('./data/models')

const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
const express = require('express')
const ecnViewer = process.env.ECN_VIEWER_PATH ? require(`${process.env.ECN_VIEWER_PATH}/package/index.js`) : require('@iofog/ecn-viewer')
const fs = require('fs')
const helmet = require('helmet')
const cors = require('cors')
const https = require('https')
const path = require('path')
const { renderFile } = require('ejs')
const xss = require('xss-clean')
const packageJson = require('../package')

const { rvaluesVarSubstition } = require('./helpers/template-helper')
const viewerApp = express()

const app = express()

app.use(cors())

const Sentry = require('@sentry/node')

const Tracking = require('./tracking')
const TrackingEventType = require('./enums/tracking-event-type')

Sentry.init({ dsn: 'https://a15f11352d404c2aa4c8f321ad9e759a@sentry.io/1378602' })
Sentry.configureScope((scope) => {
  scope.setExtra('version', packageJson.version)
})

app.use(Sentry.Handlers.requestHandler())
app.use(Sentry.Handlers.errorHandler())

app.use(helmet())
app.use(xss())

// express logs
// app.use(morgan('combined'));

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

// TODO: Template expansion for not for all
app.use((req, res, next) => {
  if (['POST', 'PUT'].indexOf(req.method) > -1) {
    rvaluesVarSubstition(req.body, { self: req.body })
  }
  next()
})

global.appRoot = path.resolve(__dirname)

const registerRoute = (route) => {
  app[route.method.toLowerCase()](route.path, route.middleware)
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
  registerServers(apiServer, viewerServer)
}

function startHttpsServer (apps, ports, sslKey, sslCert, intermedKey, jobs) {
  try {
    const sslOptions = {
      key: fs.readFileSync(sslKey),
      cert: fs.readFileSync(sslCert),
      ca: fs.readFileSync(intermedKey),
      requestCert: true,
      rejectUnauthorized: false // currently for some reason iofog agent doesn't work without this option
    }

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
    registerServers(apiServer, viewerServer)
  } catch (e) {
    logger.error('ssl_key or ssl_cert or intermediate_cert is either missing or invalid. Provide valid SSL configurations.')
  }
}

const devMode = config.get('Server:DevMode')
const apiPort = +(config.get('Server:Port'))
const viewerPort = +(process.env.VIEWER_PORT || config.get('Viewer:Port'))
const sslKey = config.get('Server:SslKey')
const sslCert = config.get('Server:SslCert')
const intermedKey = config.get('Server:IntermediateCert')

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
        fs.writeFileSync(pidFile, process.pid)
      }
    })
  }
  // Set up controller-config.js for ECN Viewer
  const ecnViewerControllerConfigFilePath = path.join(__dirname, '..', 'node_modules', '@iofog', 'ecn-viewer', 'build', 'controller-config.js')
  const ecnViewerControllerConfig = {
    port: apiPort,
    user: {}
  }
  const ecnViewerConfigScript = `
    window.controllerConfig = ${JSON.stringify(ecnViewerControllerConfig)}
  `
  fs.writeFileSync(ecnViewerControllerConfigFilePath, ecnViewerConfigScript)
}

initState()
  .then(() => {
    if (!devMode && sslKey && sslCert && intermedKey) {
      startHttpsServer({ api: app, viewer: viewerApp }, { api: apiPort, viewer: viewerPort }, sslKey, sslCert, intermedKey, jobs)
    } else {
      startHttpServer({ api: app, viewer: viewerApp }, { api: apiPort, viewer: viewerPort }, jobs)
    }
  })

const event = Tracking.buildEvent(TrackingEventType.START, `devMode is ${devMode}`)
Tracking.processEvent(event)
