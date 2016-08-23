/**
* @file fabricController.js
* @author Zishan Iqbal
* @description This file includes the implementation of the status end-point
*/

import express from 'express';
const router = express.Router();
import ioManager from "../../managers/fabricManager";
import FabricAccessTokenManager from '../../managers/fabricAccessTokenManager';
import FabricProvisionKeyManager from '../../managers/fabricProvisionKeyManager';
import FabricUserManager from '../../managers/fabricUserManager';

router.get('/api/v2/status', (req, res) => {
  var milliseconds = new Date().getTime();
  res.status(200);
  res.send({
    "status": "ok",
    "timestamp" : milliseconds
  });
});

export default router;