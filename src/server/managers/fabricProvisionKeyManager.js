/**
* @file fabricProvisionKeyManager.js
* @author Zishan Iqbal
* @description This file includes the CURD operations for the fabricProvisionKey Model.
*/

import FabricProvisionKey from './../models/fabricProvisionKey';
import Fabric from './../models/fabric';
import BaseManager from './../managers/baseManager';

class FabricProvisionKeyManager extends BaseManager {

  getEntity() {
    return FabricProvisionKey;
  }

  getByProvisionKey(key) {
  	return FabricProvisionKey.findOne({
  		where: {provisionKey : key},
      include: [Fabric]
  	});
  }

  deleteByProvisionKey(key){
  	return FabricProvisionKey.destroy({
  		where: {provisionKey : key}
  	});
  }

}

const instance = new FabricProvisionKeyManager();
export default instance;