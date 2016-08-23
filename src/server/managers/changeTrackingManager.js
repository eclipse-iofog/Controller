/**
* @file changeTrackingManager.js
* @author Zishan Iqbal
* @description This file includes the CURD operations for the changeTracking Model.
*/

import ChangeTracking from './../models/changeTracking';
import BaseManager from './../managers/baseManager';

class ChangeTrackingManager extends BaseManager {

getEntity() {
    return ChangeTracking;
  }

  findByInstanceId(instanceId) {
  	return ChangeTracking.find({
  		where: {instanceId : instanceId}
  	});
  }
}

const instance = new ChangeTrackingManager();
export default instance;
