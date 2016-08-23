/**
* @file streamViewerManager.js
* @author Zishan Iqbal
* @description This file includes the CURD operations for the streamViewer Model.
*/

import StreamViewer from './../models/streamViewer';
import BaseManager from './../managers/baseManager';

class StreamViewerManager extends BaseManager {

 	getEntity() {
  	  return StreamViewer;
  	}	

	findByInstanceId(instanceId) {
  		return StreamViewer.find({
  			where: {instance_id : instanceId}
  		});
	}
}

const instance = new StreamViewerManager();
export default instance;