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
  var params = {};

  params.bodyParams = req.query;

  async.waterfall([
    async.apply(UserService.getUser, params),
    StreamViewerService.getStreamViewerByFogInstanceId,
    ConsoleService.getConsoleByFogInstanceId,
    getResponse
  ], function(err, result) {
    var errMsg = 'Internal error: There was a problem getting the toolset access for this ioFog instance.';
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