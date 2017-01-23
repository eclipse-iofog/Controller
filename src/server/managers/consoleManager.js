/**
 * @file consoleManager.js
 * @author Zishan Iqbal
 * @description This file includes the CURD operations for the fogConsole Model.
 */

import BaseManager from './../managers/baseManager';
import FogConsole from './../models/fogConsole';

class FogConsoleManager extends BaseManager {

	getEntity() {
			return FogConsole;
		}
		/**
		 * @desc - finds the fogConsole based on the instanceId
		 * @param Integer - instanceId
		 * @return JSON - returns a JSON object of fogConsole
		 */
	findByInstanceId(instanceId) {
		return FogConsole.find({
			where: {
				iofog_uuid: instanceId
			}
		});
	}

	/**
	 * @desc - deletes the console based on the instanceId
	 * @param String - instanceId
	 * @return  Integer - returns the number of rows deleted
	 */
	deleteByInstanceId(instanceId) {
		return FogConsole.destroy({
			where: {
				iofog_uuid: instanceId
			}
		});
	}
}

const instance = new FogConsoleManager();
export default instance;