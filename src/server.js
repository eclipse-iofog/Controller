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

const config = require('./config');
const logger = require('./logger');

const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const express = require('express');
const fs = require('fs');
const helmet = require('helmet');
const https = require('https')
const path = require('path');
const {renderFile} = require('ejs');
const xss = require('xss-clean');
const morgan = require('morgan');
const fogStatusJob = require('./jobs/fog-status-job');
const packageJson = require('../package');

const app = express();
const Sentry = require('@sentry/node');

Sentry.init({ dsn: 'https://a15f11352d404c2aa4c8f321ad9e759a@sentry.io/1378602' });
Sentry.configureScope(scope => {
  scope.setExtra('version', packageJson.version);
});

app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.errorHandler());

app.use(helmet());
app.use(xss());

app.use(morgan('combined'));

app.use(bodyParser.urlencoded({
  extended: true,
}));
app.use(bodyParser.json());

app.engine('ejs', renderFile);
app.set('view engine', 'ejs');
app.use(cookieParser());

app.set('views', path.join(__dirname, 'views'));

app.on('uncaughtException', (req, res, route, err) => {
  // TODO
});

app.use((req, res, next) => {
  res.append('X-Timestamp', Date.now());
  next()
});

global.appRoot = path.resolve(__dirname);

const registerRoute = (route) => {
  app[route.method.toLowerCase()](route.path, route.middleware)
};

const setupMiddleware = function (routeName) {
  const routes = [].concat(require(path.join(__dirname, 'routes', routeName)) || [])
  routes.forEach(registerRoute)
};

fs.readdirSync(path.join(__dirname, 'routes'))
  .forEach(setupMiddleware);

let jobs = [];

const setupJobs = function (file) {
  jobs.push((require(path.join(__dirname, 'jobs', file)) || []));
};

fs.readdirSync(path.join(__dirname, 'jobs'))
  .filter(file => {
    return (file.indexOf('.') !== 0) && (file.slice(-3) === '.js');
  })
  .forEach(setupJobs);

function startHttpServer(app, port, jobs) {
  logger.silly("| SSL not configured, starting HTTP server.|");

  logger.silly("------------------------------------------");
  logger.silly("| SSL not configured, starting HTTP server.|");
  logger.silly("------------------------------------------");

  app.listen(port, function onStart(err) {
    if (err) {
      logger.error(err)
    }
    logger.silly(`==> 🌎 Listening on port ${port}. Open up http://localhost:${port}/ in your browser.`, port, port);
    jobs.forEach(job => job.run());
  })
}

function startHttpsServer(app, port, sslKey, sslCert, intermedKey, jobs) {
  try {
    let sslOptions = {
      key: fs.readFileSync(sslKey),
      cert: fs.readFileSync(sslCert),
      ca: fs.readFileSync(intermedKey),
      requestCert: true,
      rejectUnauthorized: false // currently for some reason iofog agent doesn't work without this option
    };

    https.createServer(sslOptions, app).listen(port, function onStart(err) {
      if (err) {
        logger.error(err)
      }
      logger.silly(`==> 🌎 HTTPS server listening on port ${port}. Open up https://localhost:${port}/ in your browser.`);
      jobs.forEach(job => job.run());
    })
  } catch (e) {
    logger.error('ssl_key or ssl_cert or intermediate_cert is either missing or invalid. Provide valid SSL configurations.')
  }
}

const
  devMode = config.get('Server:DevMode'),
  port = config.get('Server:Port'),
  sslKey = config.get('Server:SslKey'),
  sslCert = config.get('Server:SslCert'),
  intermedKey = config.get('Server:IntermediateCert');

if (!devMode && sslKey && sslCert && intermedKey) {
  startHttpsServer(app, port, sslKey, sslCert, intermedKey, jobs)
} else {
  startHttpServer(app, port, jobs)
}
