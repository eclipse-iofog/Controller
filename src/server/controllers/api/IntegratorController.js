/**
 * @file IntegratorController.js
 * @author Zishan Iqbal
 * @description This file includes the implementation of the Integrator instance
 */

import async from 'async';
import express from 'express';
const router = express.Router();
import FabricService from '../../services/fabricService';
import FabricTypeService from '../../services/fabricTypeService';
import FabricUserService from '../../services/fabricUserService';
import StreamViewerService from '../../services/streamViewerService';
import ChangeTrackingService from '../../services/changeTrackingService';
import ElementService from '../../services/elementService';
import ElementInstanceService from '../../services/elementInstanceService';
import ElementInstancePortService from '../../services/elementInstancePortService';
import SatelliteService from '../../services/satelliteService';
import SatellitePortService from '../../services/satellitePortService';
import NetworkPairingService from '../../services/networkPairingService';
import ConsoleService from '../../services/consoleService';
import ComsatService from '../../services/comsatService';
import AppUtils from '../../utils/appUtils';

/**
 * @desc - if this end-point is hit it sends a timeStamp in milliseconds back to the client
 * (Used to check if the server is active)
 * @return - returns and appropriate response to the client
 */
router.post('/api/v2/authoring/integrator/instance/create', (req, res) => {
  var params = {};

  params.userId = 1;
  params.bodyParams = req.body;

  async.waterfall([
    async.apply(FabricService.createFabricInstance, params),
    ChangeTrackingService.initiateFabricChangeTracking,
    FabricUserService.createFabricUser,
    FabricTypeService.getFabricTypeDetail,
    ElementInstanceService.createStreamViewerElement,
    ElementInstancePortService.createStreamViewerPort,
    ChangeTrackingService.updateChangeTracking,
    ComsatService.openPortOnRadomComsat,
    SatellitePortService.createSatellitePort,
    ElementService.getNetworkElement,
    ElementInstanceService.createNetworkElementInstance,
    ChangeTrackingService.updateChangeTrackingCL,
    NetworkPairingService.createNeworkPairing,
    StreamViewerService.createStreamViewer,
    ElementInstanceService.createDebugConsole,
    ElementInstancePortService.createDebugConsolePort,
    ElementInstanceService.updateDebugConsole,
    ChangeTrackingService.updateChangeTrackingDebugConsole,
    ComsatService.openPortOnRadomComsat,
    SatellitePortService.createSatellitePort,
    ElementService.getNetworkElement,
    ElementInstanceService.createNetworkElementInstance,
    NetworkPairingService.createDebugNeworkPairing,
    ConsoleService.createConsole,
    getFabricInstanceDetails
  ], function(err, result) {
    res.status(200);
    if (err) {
      res.send({
        'status': 'failure',
        'timestamp': new Date().getTime(),
        'errormessage': result
      });
    } else {
      res.send({
        'status': 'ok',
        'timestamp': new Date().getTime(),
        'instance': result.fabricInstance
      });
    }
  });
});

/**
 * @desc - this function finds the element instance which was changed
 */
function getFabricInstanceDetails(params, callback) {
  var fabricInstance = params.fabricInstance.dataValues;

  fabricInstance.typeName = params.fabricType.name;
  fabricInstance.typeDescription = params.fabricType.description;
  fabricInstance.typeImage = params.fabricType.image;

  callback(null, {
    fabricInstance: fabricInstance
  });
}

export default router;