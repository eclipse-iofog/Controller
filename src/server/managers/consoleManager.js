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
	/**
	 * @desc - finds the fabricConsole based on the instanceId
	 * @param Integer - instanceId
	 * @return JSON - returns a JSON object of fabricConsole
	 */
	findByInstanceId(instanceId) {
		return FabricConsole.find({
			where: {
				iofabric_id: instanceId
			}
		});
	}
}

const instance = new FabricConsoleManager();
export default instance;