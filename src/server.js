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
import fogController from './server/controllers/api/fogController';
import instanceResourcesController from './server/controllers/api/instanceResourcesController';
import instanceStatusController from './server/controllers/api/instanceStatusController';
import instanceConfigController from './server/controllers/api/instanceConfigController';
import instanceContainerListController from './server/controllers/api/instanceContainerListController';
import instanceChangesController from './server/controllers/api/instanceChangesController';
import instanceRegistriesController from './server/controllers/api/instanceRegistriesController';
import instanceRoutingController from './server/controllers/api/instanceRoutingController';
import instanceContainerConfigController from './server/controllers/api/instanceContainerConfigController';
import integratorController from './server/controllers/api/integratorController';
import provisionKeyController from './server/controllers/api/provisionKeyController';
import streamViewerController from './server/controllers/api/streamViewerController';
import trackController from './server/controllers/api/trackController';
import userController from './server/controllers/api/userController';

import logger from './server/utils/winstonLogs';
import proxyController from "./server/controllers/api/proxyController";
import fogVersionCommandController from './server/controllers/api/fogVersionCommandController';

const startServer = function (port) {
  let app,
    dbPort,
    sslKey,
    sslCert,
    intermedKey;

  app = initApp();

  configUtil.getAllConfigs()
    .then(() => {
      if (!port) {
        dbPort = configUtil.getConfigParam(constants.CONFIG.port);
        if (dbPort) {
          port = dbPort;
        } else {
          port = appConfig.port;
        }
      }
      sslKey = configUtil.getConfigParam(constants.CONFIG.ssl_key);
      sslCert = configUtil.getConfigParam(constants.CONFIG.ssl_cert);
      intermedKey = configUtil.getConfigParam(constants.CONFIG.intermediate_cert);

      if (sslKey && sslCert && intermedKey) {
        startHttpsServer(app, port, sslKey, sslCert, intermedKey);
      } else {
        startHttpServer(app, port);
      }
    });
};

const initApp = function () {
  const app = express();

  // parse application/x-www-form-urlencoded
  app.use(bodyParser.urlencoded({
    extended: true
  }));
  // parse application/json
    app.use(bodyParser.json());
  app.engine('ejs', require('ejs').renderFile);
  app.set('view engine', 'ejs');
  app.use(cookieParser());

  // CORS Enabled
  app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
  });

  app.set('views', path.join(__dirname, 'views'));

  app.get('/', baseController.mainPageEndPoint);
  app.post('/api/v1/user/login', userController.validateUserEndPoint);
  app.post('/api/v1/user/logout', userController.logoutUserEndPoint);

  app.get('/api/v2/status', fogController.getFogControllerStatusEndPoint);
  app.post('/api/v2/status', fogController.getFogControllerStatusEndPoint);
  app.get('/api/v2/instance/create/type/:type', fogController.fogInstanceCreateEndPoint);

  // app.get('/api/v2/instance/getfabriclist', fogController.getFogListEndPoint);
  app.get('/api/v2/authoring/element/get', elementController.getElementsForPublishingEndPoint);
  // app.post('/api/v2/authoring/organization/element/create', elementController.createElementEndPoint);
  // app.post('/api/v2/authoring/organization/element/update', elementController.updateElementEndPoint);
  // app.post('/api/v2/authoring/organization/element/delete', elementController.deleteElementEndPoint);
  app.get('/api/v2/authoring/element/catalog/get', elementController.getCatalogOfElements);
  app.post('/api/v2/authoring/element/instance/create', elementInstanceController.detailedElementInstanceCreateEndPoint);
  app.post('/api/v2/authoring/build/element/instance/create', elementInstanceController.elementInstanceCreateEndPoint);
  app.post('/api/v2/authoring/integrator/instance/create', integratorController.integratorInstanceCreateEndPoint);
  app.post('/api/v2/authoring/fabric/instance/create', integratorController.integratorInstanceCreateEndPoint);
  app.post('/api/v2/authoring/integrator/instance/update', integratorController.integratorInstanceUpdateEndPoint);
  app.post('/api/v2/authoring/element/instance/update', elementInstanceController.elementInstanceUpdateEndPoint);
  app.post(['/api/v2/authoring/element/instance/config/update', '/api/v2/authoring/element/instance/name/update',],
    elementInstanceController.elementInstanceConfigUpdateEndPoint);
  app.post('/api/v2/authoring/element/instance/delete', elementInstanceController.elementInstanceDeleteEndPoint);
  app.get('/api/v2/authoring/fabric/viewer/access', streamViewerController.fogViewerAccessEndPoint);
  app.get('/api/v2/instance/config/id/:ID/token/:Token', instanceConfigController.instanceConfigEndPoint);
  app.post('/api/v2/instance/config/id/:ID/token/:Token', instanceConfigController.instanceConfigEndPoint);
  app.post('/api/v2/instance/config/changes/id/:ID/token/:Token', instanceConfigController.instanceConfigChangesEndPoint);
  app.post('/api/v2/instance/status/id/:ID/token/:Token', instanceStatusController.instanceStatusEndPoint);
  app.post('/api/v2/authoring/element/instance/comsat/pipe/create', elementInstanceController.elementInstanceComsatPipeCreateEndPoint);
  app.post('/api/v2/authoring/element/instance/comsat/pipe/delete', elementInstanceController.elementInstanceComsatPipeDeleteEndPoint);
  app.post('/api/v2/authoring/element/instance/port/create', elementInstanceController.elementInstancePortCreateEndPoint);
  app.post('/api/v2/authoring/element/instance/port/delete', elementInstanceController.elementInstancePortDeleteEndPoint);
  app.get('/api/v2/authoring/integrator/instances/list/:t', fogController.fogInstancesListEndPoint); //
  app.post('/api/v2/authoring/fabric/instances/list', fogController.fogInstancesListEndPoint);
  app.post('/api/v2/authoring/integrator/instance/delete', fogController.integratorInstanceDeleteEndPoint);
  app.get('/api/v2/instance/changes/id/:ID/token/:Token/timestamp/:TimeStamp', instanceChangesController.getChangeTrackingChangesEndPoint);
  app.post('/api/v2/instance/changes/id/:ID/token/:Token/timestamp/:TimeStamp', instanceChangesController.getChangeTrackingChangesEndPoint);
  app.get('/api/v2/instance/containerconfig/id/:ID/token/:Token', instanceContainerConfigController.containerConfigEndPoint);
  app.post('/api/v2/instance/containerconfig/id/:ID/token/:Token', instanceContainerConfigController.containerConfigEndPoint);
  app.get('/api/v2/instance/containerlist/id/:ID/token/:Token', instanceContainerListController.containerListEndPoint);
  app.post('/api/v2/instance/containerlist/id/:ID/token/:Token', instanceContainerListController.containerListEndPoint);
  app.post('/api/v2/instance/proxyconfig/id/:ID/token/:Token', proxyController.getProxyEndPoint);
  app.post('/api/v2/instance/proxyconfig/changes/id/:ID/token/:Token', proxyController.updateProxyStatusEndPoint);
  app.post('/api/v2/authoring/user/track/update', trackController.userTrackUpdateEndPoint);
  app.get('/api/v2/instance/registries/id/:ID/token/:Token', instanceRegistriesController.instanceRegistriesEndPoint);
  app.post('/api/v2/instance/registries/id/:ID/token/:Token', instanceRegistriesController.instanceRegistriesEndPoint);
  app.get('/api/v2/instance/routing/id/:ID/token/:Token', instanceRoutingController.instanceRoutingEndPoint);
  app.post('/api/v2/instance/routing/id/:ID/token/:Token', instanceRoutingController.instanceRoutingEndPoint);
  app.post('/api/v2/authoring/element/instance/route/create', instanceRoutingController.instanceRouteCreateEndPoint);
  app.post('/api/v2/authoring/element/instance/route/delete', instanceRoutingController.instanceRouteDeleteEndPoint);
  app.get('/api/v2/authoring/fabric/provisioningkey/instanceid/:instanceId', provisionKeyController.getProvisionKeyEndPoint);
  app.get('/api/v2/instance/provision/key/:provisionKey/fabrictype/:fabricType', provisionKeyController.fogProvisionKeyEndPoint);
  app.post('/api/v2/instance/provision/key/:provisionKey/fabrictype/:fabricType', provisionKeyController.fogProvisionKeyEndPoint);
  app.post('/api/v2/authoring/fabric/provisioningkey/list/delete', provisionKeyController.deleteProvisionKeyEndPoint);
  app.get('/api/v2/authoring/fabric/track/list/:instanceId', trackController.fogTrackListEndPoint);
  app.post('/api/v2/authoring/element/connection/create', elementInstanceController.createElementInstanceConnectionEndPoint);
  app.post('/api/v2/authoring/element/connection/delete', elementInstanceController.deleteElementInstanceConnectionEndPoint);
  app.post('/api/v2/authoring/element/instance/rebuild', elementInstanceController.elementInstanceRebuildUpdateEndPoint);
  app.get('/api/v2/authoring/element/instance/rebuild/status/elementid/:elementId', elementInstanceController.elementInstanceRebuildStatusEndPoint);
  app.get('/api/v2/authoring/user/track/list/:t', trackController.getTracksForUser);
  app.get('/api/v2/authoring/fabric/types/list', fogController.getFogTypesEndPoint);
  app.get('/api/v2/authoring/fabric/proxy/status', proxyController.getProxyStatusEndPoint);
  app.get('/api/v2/authoring/element/instance/details/trackid/:trackId', elementInstanceController.getElementInstanceDetailsEndPoint);
  app.post('/api/v2/authoring/element/instance/details/trackid/:trackId', elementInstanceController.getElementInstanceDetailsEndPoint);
  app.post('/api/v2/authoring/build/properties/panel/get', elementInstanceController.getElementInstancePropertiesEndPoint);
  app.post('/api/v2/authoring/user/track/create', trackController.userTrackCreateEndPoint);
  app.post('/api/v2/authoring/user/track/delete', trackController.userTrackDeleteEndPoint);
  app.get('/api/v2/authoring/fabric/track/element/list/:trackId', elementInstanceController.trackElementListEndPoint);
  app.post('/api/v2/authoring/fabric/instance/delete', fogController.fogInstanceDeleteEndPoint);
  app.post('/api/v2/authoring/fabric/instances/settings/update', fogController.updateFogSettingsEndpoint);
  app.post('/api/v2/authoring/fabric/track/update', trackController.fogTrackUpdateEndPoint);
  app.post('/api/v2/authoring/fabric/track/delete', trackController.fogTrackDeleteEndPoint);
  app.post('/api/v2/authoring/fabric/details', fogController.getFogDetailsEndpoint);


    app.post('/api/v2/instance/hw_info/id/:ID/token/:Token', instanceResourcesController.fogInstanceHWInfo);
    app.post('/api/v2/instance/usb_info/id/:ID/token/:Token', instanceResourcesController.fogInstanceUSBInfo);
    app.post('/api/v2/authoring/fog/info/hw', instanceResourcesController.getFogHwInfoEndPoint);
    app.post('/api/v2/authoring/fog/info/usb', instanceResourcesController.getFogUsbInfoEndPoint);

  app.post('/api/v2/authoring/element/module/create', elementController.createElementForUserEndPoint);
  app.post('/api/v2/authoring/element/module/update', elementController.updateElementForUserEndPoint);
  app.get('/api/v2/authoring/element/module/delete/moduleid/:moduleId', elementController.deleteElementForUserEndPoint);
  app.get('/api/v2/authoring/element/module/details/moduleid/:moduleId', elementController.getElementDetailsEndPoint);
  app.post('/api/v2/authoring/fabric/instance/proxy/createOrUpdate', proxyController.createOrUpdateProxyEndPoint);
  app.post('/api/v2/authoring/fabric/instance/proxy/close', proxyController.closeProxyEndPoint);
  app.post('/api/v2/authoring/fabric/version/change', fogVersionCommandController.changeVersionEndPoint);
  app.get('/api/v2/instance/version/id/:instanceId/token/:Token', fogVersionCommandController.instanceVersionEndPoint);
  app.post('/api/v2/instance/version/id/:instanceId/token/:Token', fogVersionCommandController.instanceVersionEndPoint);
  // app.post('/api/v2/authoring/fabric/instance/bluebox/add', fogController.addBlueboxEndpoint);

  app.get('/api/v2/get/user/data/:t', userController.getUserDetailsEndPoint);
  app.post('/api/v1/user/profile/update', userController.updateUserDetailsEndPoint);
  app.post('/api/v1/user/password/change', userController.updateUserPasswordEndPoint);
  app.post('/api/v1/user/account/delete', userController.deleteUserAccountEndPoint);
  app.post('/api/v1/user/signup', userController.userSignupEndPoint);
  app.post('/api/v1/user/password/reset', userController.resetUserPasswordEndPoint);
  app.post('/api/v1/user/account/activate/resend', userController.resendEmailActivationEndPoint);
  app.get('/account/activate/code/:code', userController.activateUserAccountEndPoint);
  app.get('/api/v2/user/authenticate/:t', userController.authenticateUserEndPoint);

  //generic error handler
  app.use((err, req, res, next) => {
    logger.error('App crashed with error: ' + err);
    logger.error('App crashed with stack: ' + err.stack);
    console.log('App crashed with error: ' + err);
    console.log('App crashed with stack: ' + err.stack);
    res.status(500).send('Hmm, what you have encountered is unexpected. If problem persists, contact app provider.');
  });
  return app;
};

const startHttpServer = function (app, port) {
  logger.warn("| SSL not configured, starting HTTP server.|");

  console.log("------------------------------------------");
  console.log("| SSL not configured, starting HTTP server.|");
  console.log("------------------------------------------");

  app.listen(port, function onStart(err) {
    if (err) {
      console.log(err);
    }
    logger.info('==> 🌎 Listening on port %s. Open up http://localhost:%s/ in your browser.', port, port);
    console.log('==> 🌎 Listening on port %s. Open up http://localhost:%s/ in your browser.', port, port);
  });
};

const startHttpsServer = function (app, port, sslKey, sslCert, intermedKey) {
  try {
    let sslOptions = {
      key: fs.readFileSync(sslKey),
      cert: fs.readFileSync(sslCert),
      ca: fs.readFileSync(intermedKey),
      requestCert: true,
      rejectUnauthorized: false
    };

    https.createServer(sslOptions, app).listen(port, function onStart(err) {
      if (err) {
        logger.error(err);
        console.log(err);
      }
      logger.info('==> 🌎 HTTPS server listening on port %s. Open up https://localhost:%s/ in your browser.', port, port);
      console.log('==> 🌎 HTTPS server listening on port %s. Open up https://localhost:%s/ in your browser.', port, port);
    });
  } catch (e) {
    logger.error('ssl_key or ssl_cert or intermediate_cert is either missing or invalid. Provide valid SSL configurations.');
    console.log('ssl_key or ssl_cert or intermediate_cert is either missing or invalid. Provide valid SSL configurations.');
  }
};

export default {
  startServer: startServer
};