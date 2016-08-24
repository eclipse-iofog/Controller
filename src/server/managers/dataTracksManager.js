/**
 * @file dataTracksManager.js
 * @author Zishan Iqbal
 * @description This file includes the CURD operations for the dataTracks Model.
 */

import BaseManager from './../managers/baseManager';
import DataTracks from './../models/dataTracks';

class DataTracksManager extends BaseManager {

	getEntity() {
		return DataTracks;
	}
}

const instance = new DataTracksManager();
export default instance;