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

/**
 * @file streamViewerController.js
 * @author Zishan Iqbal
 * @description This file includes the implementation of the StreamViewer related endpoints
 */

const async = require('async');

const ConsoleService = require('../../services/consoleService');
const StreamViewerService = require('../../services/streamViewerService');
const UserService = require('../../services/userService');
const AppUtils = require('../../utils/appUtils');
const logger = require('../../utils/winstonLogs');


/********************************************* EndPoints ******************************************************/

/******************** Fog Viewer Access EndPoint (Get: /api/v2/authoring/fog/viewer/access) ***************/
const fogViewerAccessEndPoint = function(req, res){
  logger.info("Endpoint hit: "+ req.originalUrl);
  let params = {},

  userProps = {
    userId: 'bodyParams.t',
    setProperty: 'user'
  },
  streamViewerProps = {
    instanceId: 'bodyParams.instanceId',
    setProperty: 'streamViewer'
  },
  consoleProps={
    instanceId: 'bodyParams.instanceId',
    setProperty: 'console'
  };
 params.bodyParams = req.query;
 logger.info("Parameters:" + JSON.stringify(params.bodyParams));

  async.waterfall([
    async.apply(UserService.getUser, userProps, params),
    async.apply(StreamViewerService.getStreamViewerByFogInstanceId, streamViewerProps),
    async.apply(ConsoleService.getConsoleByFogInstanceId, consoleProps),
    getResponse
  ], function(err, result) {
    let errMsg = 'Internal error: There was a problem getting the toolset access for this ioFog instance.'+result;
    AppUtils.sendResponse(res, err, 'access', result.output, errMsg);
  });
};

/************************************* Extra Functions **************************************************/
const getResponse = function(params, callback) {
  let output = {};

  if (params.streamViewer) {
    output.streamViewerUrl = params.streamViewer.apiBaseUrl;
    output.streamViewerToken = params.streamViewer.accessToken;
  }

  if (params.console) {
    output.consoleUrl = params.console.apiBaseUrl;
    output.consoleToken = params.console.accessToken;
  }

  callback(null, {
    'output': output
  });
}

module.exports =  {
  fogViewerAccessEndPoint: fogViewerAccessEndPoint
};