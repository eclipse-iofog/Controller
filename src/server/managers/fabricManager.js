/**
* @file fabricManager.js
* @author Zishan Iqbal
* @description This file includes the CURD operations for the fabric Model.
*/

import Fabric from './../models/fabric';
import BaseManager from './../managers/baseManager';

class FabricManager extends BaseManager {
  getEntity() {
    return Fabric;
  }

  findByInstanceId(instanceId) {
  	return Fabric.find({
  		where: {id : instanceId}
  	});
  }


  updateFabricConfig(instanceId, config){
    return Fabric.update(config,
    {
      where: { id : instanceId}
    });
  }
}

const instance = new FabricManager();
export default instance;