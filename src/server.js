/*
 * *******************************************************************************
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

const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const https = require('https');
const http = require('http');
const appConfig = require('./config.json');
const configUtil = require('./server/utils/configUtil');
const constants = require('./server/constants.js');

const baseController = require('./server/controllers/baseController');
const elementInstanceController = require('./server/controllers/api/elementInstanceController');
const elementController = require('./server/controllers/api/elementController');
const fogController = require('./server/controllers/api/fogController');
const instanceResourcesController = require('./server/controllers/api/instanceResourcesController');
const instanceStatusController = require('./server/controllers/api/instanceStatusController');
const instanceConfigController = require('./server/controllers/api/instanceConfigController');
const instanceContainerListController = require('./server/controllers/api/instanceContainerListController');
const instanceChangesController = require('./server/controllers/api/instanceChangesController');
const instanceRegistriesController = require('./server/controllers/api/instanceRegistriesController');
const instanceRoutingController = require('./server/controllers/api/instanceRoutingController');
const instanceContainerConfigController = require('./server/controllers/api/instanceContainerConfigController');
const integratorController = require('./server/controllers/api/integratorController');
const provisionKeyController = require('./server/controllers/api/provisionKeyController');
const streamViewerController = require('./server/controllers/api/streamViewerController');
const trackController = require('./server/controllers/api/trackController');
const userController = require('./server/controllers/api/userController');
const registryController = require('./server/controllers/api/registryController');

const logger = require('./server/utils/winstonLogs');
const proxyController = require('./server/controllers/api/proxyController');
const sshController = require('./server/controllers/api/sshController');
const fogVersionCommandController = require('./server/controllers/api/fogVersionCommandController');
const diagnosticsController = require('./server/controllers/api/diagnosticsController');
const imageSnapshotController = require('./server/controllers/api/imageSnapshotController');
const presetController = require('./server/controllers/api/presetController');
const sshSocket = require('./sshServer/socket');
const socketIO = require('socket.io');
const express = require('express');
const path = require('path');
const session = require('express-session')({
	secret: appConfig.ssh2.session.secret,
	name: appConfig.ssh2.session.name,
	resave: true,
	saveUninitialized: false
});
const compression = require('compression');

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

    const sourceDir = path.resolve(__dirname);
    global.appRoot = sourceDir.endsWith('/dist')? sourceDir.substring(0, sourceDir.length - 4) : sourceDir;

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

  app.use(session);
  app.use(compression({level: 9}));
  if (appConfig.ssh2.accesslog) app.use(logger('common'));
  app.disable('x-powered-by');
  // static files
  app.use(express.static(path.join(__dirname, 'sshClient', 'public'), {
        dotfiles: 'ignore',
        etag: false,
        extensions: ['htm', 'html'],
        index: false,
        maxAge: '1s',
        redirect: false,
        setHeaders: function (res, path, stat) {
            res.set('x-timestamp', Date.now())
	  }
  }));

  app.set('views', path.join(__dirname, 'views'));

  app.get('/', baseController.mainPageEndPoint);
  app.post('/api/v1/user/login', userController.validateUserEndPoint);
  app.post('/api/v1/user/logout', userController.logoutUserEndPoint);

  app.get('/api/v2/status', fogController.getFogControllerStatusEndPoint);
  app.post('/api/v2/status', fogController.getFogControllerStatusEndPoint);
  app.get('/api/v2/instance/create/type/:type', fogController.fogInstanceCreateEndPoint);

  // app.get('/api/v2/instance/getfoglist', fogController.getFogListEndPoint);
  app.get('/api/v2/authoring/element/get', elementController.getElementsForPublishingEndPoint);
  // app.post('/api/v2/authoring/organization/element/create', elementController.createElementEndPoint);
  // app.post('/api/v2/authoring/organization/element/update', elementController.updateElementEndPoint);
    // app.post('/api/v2/authoring/organization/element/delete', elementController.deleteElementEndPoint);
    app.post('/api/v2/authoring/list/element/instance/', elementInstanceController.listElementInstanceWithStatusEndPoint);
  app.get('/api/v2/authoring/element/catalog/get', elementController.getCatalogOfElements);
  app.post('/api/v2/authoring/element/instance/create', elementInstanceController.detailedElementInstanceCreateEndPoint);
  app.post('/api/v2/authoring/build/element/instance/create', elementInstanceController.elementInstanceCreateEndPoint);
  app.post('/api/v2/authoring/integrator/instance/create', integratorController.integratorInstanceCreateEndPoint);
  app.post('/api/v2/authoring/fog/instance/create', integratorController.integratorInstanceCreateEndPoint);
  app.post('/api/v2/authoring/integrator/instance/update', integratorController.integratorInstanceUpdateEndPoint);
  app.post('/api/v2/authoring/element/instance/update', elementInstanceController.elementInstanceUpdateEndPoint);
  app.post(['/api/v2/authoring/element/instance/config/update', '/api/v2/authoring/element/instance/name/update',],
    elementInstanceController.elementInstanceConfigUpdateEndPoint);
  app.post('/api/v2/authoring/element/instance/delete', elementInstanceController.elementInstanceDeleteEndPoint);
  app.get('/api/v2/authoring/fog/viewer/access', streamViewerController.fogViewerAccessEndPoint);
  app.get('/api/v2/instance/config/id/:ID/token/:Token', instanceConfigController.instanceConfigEndPoint);
  app.post('/api/v2/instance/config/id/:ID/token/:Token', instanceConfigController.instanceConfigEndPoint);
  app.post('/api/v2/instance/config/changes/id/:ID/token/:Token', instanceConfigController.instanceConfigChangesEndPoint);
  app.post('/api/v2/instance/status/id/:ID/token/:Token', instanceStatusController.instanceStatusEndPoint);
  app.post('/api/v2/authoring/element/instance/comsat/pipe/create', elementInstanceController.elementInstanceComsatPipeCreateEndPoint);
  app.post('/api/v2/authoring/element/instance/comsat/pipe/delete', elementInstanceController.elementInstanceComsatPipeDeleteEndPoint);
  app.post('/api/v2/authoring/element/instance/port/create', elementInstanceController.elementInstancePortCreateEndPoint);
  app.post('/api/v2/authoring/element/instance/port/delete', elementInstanceController.elementInstancePortDeleteEndPoint);
  app.get('/api/v2/authoring/integrator/instances/list/:t', fogController.fogInstancesListEndPoint); //
  app.post('/api/v2/authoring/fog/instances/list', fogController.fogInstancesListEndPoint);
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
  app.get('/api/v2/authoring/fog/provisioningkey/instanceid/:instanceId', provisionKeyController.getProvisionKeyEndPoint);
  app.get('/api/v2/instance/provision/key/:provisionKey/fogtype/:fogType', provisionKeyController.fogProvisionKeyEndPoint);
  app.post('/api/v2/instance/provision/key/:provisionKey/fogtype/:fogType', provisionKeyController.fogProvisionKeyEndPoint);
  app.post('/api/v2/authoring/fog/provisioningkey/list/delete', provisionKeyController.deleteProvisionKeyEndPoint);
  app.get('/api/v2/authoring/fog/track/list/:instanceId', trackController.fogTrackListEndPoint);
  app.post('/api/v2/authoring/element/connection/create', elementInstanceController.createElementInstanceConnectionEndPoint);
  app.post('/api/v2/authoring/element/connection/delete', elementInstanceController.deleteElementInstanceConnectionEndPoint);
  app.post('/api/v2/authoring/element/instance/rebuild', elementInstanceController.elementInstanceRebuildUpdateEndPoint);
  app.get('/api/v2/authoring/element/instance/rebuild/status/elementid/:elementId', elementInstanceController.elementInstanceRebuildStatusEndPoint);
  app.get('/api/v2/authoring/user/track/list/:t', trackController.getTracksForUser);
  app.get('/api/v2/authoring/fog/types/list', fogController.getFogTypesEndPoint);
  app.get('/api/v2/authoring/element/instance/details/trackid/:trackId', elementInstanceController.getElementInstanceDetailsEndPoint);
  app.post('/api/v2/authoring/element/instance/details/trackid/:trackId', elementInstanceController.getElementInstanceDetailsEndPoint);
  app.post('/api/v2/authoring/build/properties/panel/get', elementInstanceController.getElementInstancePropertiesEndPoint);
  app.post('/api/v2/authoring/user/track/create', trackController.userTrackCreateEndPoint);
  app.post('/api/v2/authoring/user/track/delete', trackController.userTrackDeleteEndPoint);
  app.get('/api/v2/authoring/fog/track/element/list/:trackId', elementInstanceController.trackElementListEndPoint);
  app.post('/api/v2/authoring/fog/instance/delete', fogController.fogInstanceDeleteEndPoint);
  app.post('/api/v2/instance/deleteNode/id/:ID/token/:Token', fogController.fogInstanceDeleteNodeEndPoint);
  app.post('/api/v2/authoring/fog/instances/settings/update', fogController.updateFogSettingsEndpoint);
  app.post('/api/v2/authoring/fog/track/update', trackController.fogTrackUpdateEndPoint);
  app.post('/api/v2/authoring/fog/track/delete', trackController.fogTrackDeleteEndPoint);
  app.post('/api/v2/authoring/fog/details', fogController.getFogDetailsEndpoint);

  app.post('/api/v2/authoring/element/imageSnapshot/status', imageSnapshotController.elementInstanceImageSnapshotStatusEndPoint);
  app.post('/api/v2/authoring/element/imageSnapshot', imageSnapshotController.getElementInstanceImageSnapshotEndPoint);
  app.get('/api/v2/authoring/element/imageSnapshot', imageSnapshotController.getElementInstanceImageSnapshotEndPoint);
  app.post('/api/v2/instance/imageSnapshotPut/id/:ID/token/:Token', imageSnapshotController.instanceImageSnapshotUrlEndPoint);
  app.get('/api/v2/instance/imageSnapshotGet/id/:ID/token/:Token', imageSnapshotController.getImageSnapshotStatusEndPoint);
  app.post('/api/v2/instance/imageSnapshotGet/id/:ID/token/:Token', imageSnapshotController.getImageSnapshotStatusEndPoint);

    app.post('/api/v2/instance/hw_info/id/:ID/token/:Token', instanceResourcesController.fogInstanceHWInfo);
    app.post('/api/v2/instance/usb_info/id/:ID/token/:Token', instanceResourcesController.fogInstanceUSBInfo);
    app.post('/api/v2/authoring/fog/info/hw', instanceResourcesController.getFogHwInfoEndPoint);
    app.post('/api/v2/authoring/fog/info/usb', instanceResourcesController.getFogUsbInfoEndPoint);

    app.get('/api/v2/authoring/registry/list', registryController.listRegistryEndPoint);
    app.post('/api/v2/authoring/registry/add', registryController.addRegistryEndPoint);
    app.post('/api/v2/authoring/registry/delete', registryController.deleteRegistryEndPoint);

  app.post('/api/v2/authoring/element/module/create', elementController.createElementForUserEndPoint);
  app.post('/api/v2/authoring/element/module/update', elementController.updateElementForUserEndPoint);
  app.get('/api/v2/authoring/element/module/delete/moduleid/:moduleId', elementController.deleteElementForUserEndPoint);
  app.get('/api/v2/authoring/element/module/details/moduleid/:moduleId', elementController.getElementDetailsEndPoint);
  app.post('/api/v2/authoring/fog/instance/proxy/createOrUpdate', proxyController.saveProxyEndPoint);
  app.post('/api/v2/authoring/fog/instance/proxy/close', proxyController.closeProxyEndPoint);
  app.post('/api/v2/authoring/fog/instance/proxy/data', proxyController.getProxyDataEndPoint);
  app.post('/api/v2/authoring/fog/instance/proxy/closeStatus', proxyController.getProxyCloseStatusEndPoint)
    app.use('/api/v2/authoring/fog/instance/ssh/host/:host?', sshController.basicAuth);
	app.use('/api/v2/authoring/fog/instance/ssh/host/:host?', sshController.checkRemotePortMiddleware);
	app.get('/api/v2/authoring/fog/instance/ssh/host/:host?', sshController.openTerminalWindowEndPoint);
	app.get('/api/v2/authoring/fog/instance/ssh/reauth', sshController.reauthEndPoint);
  app.post('/api/v2/authoring/fog/version/change', fogVersionCommandController.changeVersionEndPoint);
  app.get('/api/v2/instance/version/id/:instanceId/token/:Token', fogVersionCommandController.instanceVersionEndPoint);
  app.post('/api/v2/instance/version/id/:instanceId/token/:Token', fogVersionCommandController.instanceVersionEndPoint);
  // app.post('/api/v2/authoring/fog/instance/bluebox/add', fogController.addBlueboxEndpoint);
  app.post('/api/v2/authoring/element/diagnostics/strace/switch', diagnosticsController.switchElementStrace);
  app.post('/api/v2/instance/strace/push/id/:instanceId/token/:Token', diagnosticsController.pushStraceData);
  app.post('/api/v2/instance/diagnostics/id/:instanceId/token/:Token', diagnosticsController.getDiagnosticsInfo);
  app.post('/api/v2/authoring/element/diagnostics/strace/pop/json', diagnosticsController.popStraceDataAsJson);
  app.post('/api/v2/authoring/element/diagnostics/strace/pop/file/', diagnosticsController.popStraceDataAsFile);
  app.post('/api/v2/authoring/element/diagnostics/strace/pop/ftp/', diagnosticsController.popStraceDataToFtp);

  app.get('/api/v2/get/user/data/:t', userController.getUserDetailsEndPoint);
  app.post('/api/v1/user/profile/update', userController.updateUserDetailsEndPoint);
  app.post('/api/v1/user/password/change', userController.updateUserPasswordEndPoint);
  app.post('/api/v1/user/account/delete', userController.deleteUserAccountEndPoint);
  app.post('/api/v1/user/signup', userController.userSignupEndPoint);
  app.post('/api/v1/user/password/reset', userController.resetUserPasswordEndPoint);
  app.post('/api/v1/user/account/activate/resend', userController.resendEmailActivationEndPoint);
  app.get('/account/activate/code/:code', userController.activateUserAccountEndPoint);
  app.get('/api/v2/user/authenticate/:t', userController.authenticateUserEndPoint);
  app.get('/api/v2/emailActivation', fogController.getEmailActivationEndPoint);

  app.post('/api/v2/authoring/preset/fromConfig', presetController.testPreset);

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

  const server = http.createServer(app);
  bindSshSocket(server);
  server.listen(port, function onStart(err) {
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
      rejectUnauthorized: false // currently for some reason iofog agent doesn't work without this option
    };

    const server = https.createServer(sslOptions, app);
    bindSshSocket(server);
    server.listen(port, function onStart(err) {
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

const bindSshSocket = function (server) {
	const io = socketIO(server, { serveClient: false })
	const socket = sshSocket.socket;

	// socket.io
    // expose express session with socket.request.session
	io.use(function (socket, next) {
		(socket.request.res) ? session(socket.request, socket.request.res, next)
			: next(next)
	})

	// bring up socket
	io.on('connection', socket)
}

module.exports =  {
  startServer: startServer
};