/*
 *  *******************************************************************************
 *  * Copyright (c) 2018 Edgeworx, Inc.
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

const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
const express = require('express')
const fs = require('fs')
const helmet = require('helmet')
const https = require('https')
const path = require('path')
const { renderFile } = require('ejs')
const xss = require('xss-clean')
const packageJson = require('../package')

const viewerApp = express()

const app = express()

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
  extended: true,
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
  res.append('X-Timestamp', Date.now())
  next()
})

global.appRoot = path.resolve(__dirname)

const registerRoute = (route) => {
  app[route.method.toLowerCase()](route.path, route.middleware)
}

const setupMiddleware = function(routeName) {
  const routes = [].concat(require(path.join(__dirname, 'routes', routeName)) || [])
  routes.forEach(registerRoute)
}

fs.readdirSync(path.join(__dirname, 'routes'))
  .forEach(setupMiddleware)

viewerApp.use('/', ecnViewer.middleware(express))

const jobs = []

const setupJobs = function(file) {
  jobs.push((require(path.join(__dirname, 'jobs', file)) || []))
}

fs.readdirSync(path.join(__dirname, 'jobs'))
    .filter((file) => {
      return (file.indexOf('.') !== 0) && (file.slice(-3) === '.js')
    })
    .forEach(setupJobs)

function startHttpServer (apps, ports, jobs) {
  logger.info('SSL not configured, starting HTTP server.')

  apps.viewer.listen(ports.viewer, function onStart (err) {
    if (err) {
      logger.error(err)
    }
    logger.info(`==> 🌎 Viewer listening on port ${ports.viewer}. Open up http://localhost:${ports.viewer}/ in your browser.`)
  })
  apps.api.listen(ports.api, function onStart (err) {
    if (err) {
      logger.error(err)
    }
    logger.info(`==> 🌎 API Listening on port ${ports.api}. Open up http://localhost:${ports.api}/ in your browser.`)
    jobs.forEach((job) => job.run())
  })
}

function startHttpsServer (apps, ports, sslKey, sslCert, intermedKey, jobs) {
  try {
    const sslOptions = {
      key: fs.readFileSync(sslKey),
      cert: fs.readFileSync(sslCert),
      ca: fs.readFileSync(intermedKey),
      requestCert: true,
      rejectUnauthorized: false, // currently for some reason iofog agent doesn't work without this option
    }

    https.createServer(sslOptions, apps.viewer).listen(ports.viewer, function onStart (err) {
      if (err) {
        logger.error(err)
      }
      logger.info(`==> 🌎 HTTPS Viewer server listening on port ${ports.viewer}. Open up https://localhost:${ports.viewer}/ in your browser.`)
      jobs.forEach((job) => job.run())
    })

    https.createServer(sslOptions, apps.api).listen(ports.api, function onStart (err) {
      if (err) {
        logger.error(err)
      }
      logger.info(`==> 🌎 HTTPS API server listening on port ${ports.api}. Open up https://localhost:${ports.api}/ in your browser.`)
      jobs.forEach((job) => job.run())
    })
  } catch (e) {
    logger.error('ssl_key or ssl_cert or intermediate_cert is either missing or invalid. Provide valid SSL configurations.')
  }
}

const devMode = config.get('Server:DevMode')
const apiPort = config.get('Server:Port')
const viewerPort = config.get('Viewer:Port')
const sslKey = config.get('Server:SslKey')
const sslCert = config.get('Server:SslCert')
const intermedKey = config.get('Server:IntermediateCert')

if (!devMode && sslKey && sslCert && intermedKey) {
  startHttpsServer({ api: app, viewer: viewerApp }, { api: apiPort, viewer: viewerPort }, sslKey, sslCert, intermedKey, jobs)
} else {
  startHttpServer({ api: app, viewer: viewerApp }, { api: apiPort, viewer: viewerPort }, jobs)
}

const event = Tracking.buildEvent(TrackingEventType.START, `devMode is ${devMode}`)
Tracking.processEvent(event)
