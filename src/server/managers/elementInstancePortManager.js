/**
* @file elementInstancePortManager.js
* @author Zishan Iqbal
* @description This file includes the CURD operations for the elementInstancePort Model.
*/

import ElementInstancePort from './../models/elementInstancePort';
import BaseManager from './../managers/baseManager';

class ElementInstancePortManager extends BaseManager {
	getEntity() {
    return FabricProvisionKey;
  }

  getPortsByElementId(id) {
  	return ElementInstancePort.findAll({
  		where: {element_id : id}
  	});
  }

}

const instance = new ElementInstancePortManager();
export default instance;
