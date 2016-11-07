import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
const express = require('express');
import expressSession from 'express-session';
import fs from 'fs';
import https from 'https';
const path = require('path');
import session from 'express-session';

import appConfig from './config.json';
import appUtils from './server/utils/appUtils';
import configUtil from './server/utils/configUtil';
import constants from './server/constants.js';

import baseController from './server/controllers/baseController';
import elementInstanceController from './server/controllers/api/elementInstanceController';
import elementController from './server/controllers/api/elementController';
import fabricController from './server/controllers/api/fabricController';
import instanceStatusController from './server/controllers/api/instanceStatusController';
import instanceConfigController from './server/controllers/api/instanceConfigController';
import instanceContainerListController from './server/controllers/api/instanceContainerListController';
import instanceChangesController from './server/controllers/api/instanceChangesController';
import instanceRegistriesController from './server/controllers/api/instanceRegistriesController';
import instanceRoutingController from './server/controllers/api/instanceRoutingController';
import instanceContainerConfigController from './server/controllers/api/instanceContainerConfigController';
import integratorController from './server/controllers/api/integratorController';
import provisionKeyController from './server/controllers/api/provisionKeyController';
import trackController from './server/controllers/api/trackController';
import streamViewerController from './server/controllers/api/streamViewerController';

const startServer = function(port) {
  let app,
    dbPort,
    sslKey,
    sslCert,
    intermedKey;

  app = initApp();

  configUtil.getAllConfigs()
    .then(() => {
      if (!port) {
        dbPort = configUtil.getConfigParam(constants.CONFIG.PORT);
        console.log(dbPort);
        if (dbPort) {
          port = dbPort;
        } else {
          port = appConfig.port;
        }
      }
      sslKey = configUtil.getConfigParam(constants.CONFIG.SSL_KEY);
      if (sslKey) {
        sslCert = configUtil.getConfigParam(constants.CONFIG.SSL_CERT);
        intermedKey = configUtil.getConfigParam(constants.CONFIG.INTERMEDIATE_CERT);
        startHttpsServer(app, port, sslKey, sslCert, intermedKey);
      } else {
        startHttpServer(app, port);
      }
    });
}

const initApp = function() {
  const app = express();

  // parse application/x-www-form-urlencoded
  app.use(bodyParser.urlencoded({
      extended: true
    }))
    // parse application/json
  app.use(bodyParser.json())
  app.engine('ejs', require('ejs').renderFile);
  app.set('view engine', 'ejs');
  app.use(cookieParser());


  app.set('views', path.join(__dirname, 'views'));

  app.use('', baseController);
  app.use('', elementController);
  app.use('', elementInstanceController);
  app.use('', fabricController);
  app.use('', instanceStatusController);
  app.use('', instanceConfigController);
  app.use('', instanceContainerListController);
  app.use('', instanceChangesController);
  app.use('', instanceRegistriesController);
  app.use('', instanceRoutingController);
  app.use('', instanceContainerConfigController);
  app.use('', integratorController);
  app.use('', provisionKeyController);
  app.use('', streamViewerController);
  app.use('', trackController);

  //generic error handler
  app.use((err, req, res, next) => {
    console.log('App crashed with error: ' + err);
    console.log('App crashed with stack: ' + err.stack);
    res.status(500).send('Hmm, what you have encountered is unexpected. If problem persists, contact app provider.');
  });
  return app;
}

const startHttpServer = function(app, port) {
  console.log("------------------------------------------");
  console.log("| SSL not configured, starting HTTP server.|");
  console.log("------------------------------------------");

  app.listen(port, function onStart(err) {
    if (err) {
      console.log(err);
    }
    console.info('==> 🌎 Listening on port %s. Open up http://0.0.0.0:%s/ in your browser.', port, port);
  });
}

const startHttpsServer = function(app, port, sslKey, sslCert, intermedKey) {
  let sslOptions = {
    key: fs.readFileSync(sslKey),
    cert: fs.readFileSync(sslCert),
    ca: fs.readFileSync(intermedKey),
    requestCert: true,
    rejectUnauthorized: false
  };

  https.createServer(sslOptions, app).listen(port, function onStart(err) {
    if (err) {
      console.log(err);
    }
    console.info('==> 🌎 HTTPS server listening on port %s. Open up http://0.0.0.0:%s/ in your browser.', port, port);
  });
}

export default {
  startServer: startServer
};