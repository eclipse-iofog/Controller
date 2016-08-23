/**
* @file consoleManager.js
* @author Zishan Iqbal
* @description This file includes the CURD operations for the fabricConsole Model.
*/

import BaseManager from './../managers/baseManager';
import FabricConsole from './../models/fabricConsole';

class FabricConsoleManager extends BaseManager {

 	getEntity() {
  	  return FabricConsole;
  	}	

	findByInstanceId(instanceId) {
  		return FabricConsole.find({
  			where: {iofabric_id : instanceId}
  		});
	}
}

const instance = new FabricConsoleManager();
export default instance;