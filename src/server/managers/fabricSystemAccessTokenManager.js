/**
* @file fabricSystemAccessTokenManager.js
* @author Zishan Iqbal
* @description This file includes the CURD operations for the fabricSystemAccessToken Model.
*/

import FabricSystemAccessToken from './../models/fabricSystemAccessToken';
import BaseManager from './../managers/baseManager';

class FabricSystemAccessTokenManager extends BaseManager {
  getEntity() {
    return FabricSystemAccessToken;
  }
}

const instance = new FabricSystemAccessTokenManager();
export default instance;