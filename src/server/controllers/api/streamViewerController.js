/**
 * @file streamViewerController.js
 * @author Zishan Iqbal
 * @description This file includes the implementation of the StreamViewer related endpoints
 */

import async from 'async';
import express from 'express';
const router = express.Router();

import ConsoleService from '../../services/consoleService';
import FabricService from '../../services/fabricService';
import StreamViewerService from '../../services/streamViewerService';
import UserService from '../../services/userService';


import AppUtils from '../../utils/appUtils';

router.get('/api/v2/authoring/fabric/viewer/access', (req, res) => {
  var params = {},
   userProps;

  params.bodyParams = req.query;

  userProps = {
    userId: 'bodyParams.userId',
    setProperty: 'user'
  },
  streamViewerProps = {
    instanceId: 'bodyParams.instanceId',
    setProperty: 'streamViewer'
  },
  consoleProps={
    instanceId: 'bodyParams.ID',
    setProperty: 'console'
  };

  async.waterfall([
    async.apply(UserService.getUser, userProps, params),
    async.apply(StreamViewerService.getStreamViewerByFogInstanceId, streamViewerProps),
    async.apply(ConsoleService.getConsoleByFogInstanceId, consoleProps),
    getResponse
  ], function(err, result) {
    var errMsg = 'Internal error: There was a problem getting the toolset access for this ioFog instance.'+result;
    AppUtils.sendResponse(res, err, 'access', result.output, errMsg);
  });
});

function getResponse(params, callback) {
  var output = {};

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

export default router;