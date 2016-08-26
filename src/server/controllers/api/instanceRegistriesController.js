/**
 * @file instanceRegistriesController.js
 * @author Zishan Iqbal
 * @description This file includes the implementation of the instance-registries end-point
 */

import async from 'async';
import express from 'express';
const router = express.Router();
import RegistryManager from '../../managers/registryManager';
import FabricRegistryManager from '../../managers/fabricRegistryManager';
import BaseApiController from './baseApiController';

import AppUtils from '../../utils/appUtils';
import Constants from '../../constants.js';

router.get('/api/v2/instance/registries/id/:ID/token/:Token', BaseApiController.checkUserExistance, (req, res) => {
  var milliseconds = new Date().getTime(),
    instanceId = req.params.ID,
    i,
    registriesArr;
  /**
   * @desc - if registry are found, this function populates an Array of registries and sends it to the client
   * @param Integer - instanceId
   * @return - returns an appropriate response to the client
   */
  RegistryManager.findByInstanceId(instanceId)
    .then((registries) => {

        registriesArr = new Array();
        for (var i = 0; i < registries.length; i++) {
          registriesArr.push({
            'url': registries[i].url,
            'secure': registries[i].secure == 1 ? true : false,
            'certificate': registries[i].certificate,
            'requirescert': registries[i].requirescert == 1 ? true : false,
            'username': registries[i].username,
            'password': registries[i].password,
            'useremail': registries[i].useremail
          });
        }

        res.send({
          'status': 'ok',
          'timestamp': new Date().getTime(),
          'registries': registriesArr
        });
      },
      (err) => {
        console.log(err);
        res.send({
          'status': 'failure',
          'timestamp': new Date().getTime(),
          'errormessage': Constants.MSG.ERROR_ACCESS_DENIED
        });
      });
});

export default router;