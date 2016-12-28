/**
 * @file instanceRegistriesController.js
 * @author Zishan Iqbal
 * @description This file includes the implementation of the instance-registries end-point
 */
import async from 'async';
import express from 'express';
const router = express.Router();

import BaseApiController from './baseApiController';
import RegistryService from '../../services/registryService';

import AppUtils from '../../utils/appUtils';
import Constants from '../../constants.js';

router.get('/api/v2/instance/registries/id/:ID/token/:Token', BaseApiController.checkUserExistance, (req, res) => {
    instanceRegistries(req, res);
});

router.post('/api/v2/instance/registries/id/:ID/token/:Token', BaseApiController.checkUserExistance, (req, res) => {
    instanceRegistries(req, res);
});

const instanceRegistries = function (req, res){
  var params = {},
      instanceProps={
      instanceId: 'bodyParams.ID',
      setProperty: 'registry'
      };

  params.bodyParams = req.params;

  async.waterfall([
    async.apply(RegistryService.findRegistriesByInstanceId , instanceProps, params)
  
  ], function(err, result) {
      AppUtils.sendResponse(res, err, 'registries', params.registry, result);  
  });
};

export default router;