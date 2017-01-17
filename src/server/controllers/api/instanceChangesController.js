/**
 * @file instanceChangesController.js
 * @author Zishan Iqbal
 * @description This file includes the implementation of the instance-changes end-point
 */

import async from 'async';
import express from 'express';
const router = express.Router();

import BaseApiController from './baseApiController';
import ChangeTrackingService from '../../services/changeTrackingService';
import FabricService from '../../services/fabricService';
import AppUtils from '../../utils/appUtils';

/**
 * @desc - if there is changeTracking data present, the data is checked against the timpstamp
 * and the client is responsed with the true values for the changed data and false for unchanged data.
 * @param Integer - instanceId
 * @return - returns and appropriate response to the client
 */

router.get('/api/v2/instance/changes/id/:ID/token/:Token/timestamp/:TimeStamp', BaseApiController.checkUserExistance, (req, res) => {
  getChangeTrackingChanges(req, res);
});

router.post('/api/v2/instance/changes/id/:ID/token/:Token/timestamp/:TimeStamp', BaseApiController.checkUserExistance, (req, res) => {
  getChangeTrackingChanges(req, res);
});

const getChangeTrackingChanges = function(req, res) {
  var params = {},
      instanceProps = {
        instanceId: 'bodyParams.ID',
        setProperty: 'changeTrackingData'
    };

  params.bodyParams = req.params;

  async.waterfall([
    async.apply(ChangeTrackingService.getChangeTrackingByInstanceId, instanceProps, params),
    processChangeTrackingChanges,
    updateFogInstance

  ], function(err, result) {
    AppUtils.sendResponse(res, err, 'changes', params.changes, result);
  })
}

const processChangeTrackingChanges = function(params, callback) {
  if(params.bodyParams.TimeStamp.length < 1) {
    params.bodyParams.TimeStamp = 0;
  }
  var changes = {
        config: false,
        containerlist: false,
        containerconfig: false,
        routing: false,
        registeries: false
  };
  
  if(params.changeTrackingData.config > params.bodyParams.TimeStamp) {
    changes.config = true;
  }
    
  if(params.changeTrackingData.containerList > params.bodyParams.TimeStamp) {
    changes.containerlist = true;
  }

  if(params.changeTrackingData.containerConfig > params.bodyParams.TimeStamp) {
    changes.containerconfig = true;
  }
    
  if(params.changeTrackingData.routing > params.bodyParams.TimeStamp) {
    changes.routing = true;
  }

  if (params.changeTrackingData.registeries > params.bodyParams.TimeStamp) {
    changes.registeries = true;
  }
  params.changes = changes;
  callback (null, params);
}

const updateFogInstance = function(params, callback){
  var fogInstanceProps = {
        instanceId: 'bodyParams.ID',
        updatedFog: {
          lastactive : new Date().getTime(),
        }
      };
  FabricService.updateFogInstance(fogInstanceProps, params, callback);
}

export default router;