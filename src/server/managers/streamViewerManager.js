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
	/**
	 * @desc - finds the StreamViewer based on the instanceId
	 * @param Integer - instanceId
	 * @return JSON - returns a JSON object of streamViewer
	 */
	findByInstanceId(instanceId) {
		return StreamViewer.find({
			where: {
				instance_id: instanceId
			}
		});
	}

}

const instance = new StreamViewerManager();
export default instance;