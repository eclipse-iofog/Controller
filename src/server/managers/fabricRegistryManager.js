/**
 * @file fabricRegistryManager.js
 * @author Zishan Iqbal
 * @description This file includes the CURD operations for the fabricRegistry Model.
 */

import FabricRegistry from './../models/fabricRegistry';
import BaseManager from './../managers/baseManager';

class FabricRegistryManager extends BaseManager {

	getEntity() {
		return FabricRegistry;
	}

}

const instance = new FabricRegistryManager();
export default instance;