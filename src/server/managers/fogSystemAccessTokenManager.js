/**
 * @file fogSystemAccessTokenManager.js
 * @author Zishan Iqbal
 * @description This file includes the CURD operations for the fogSystemAccessToken Model.
 */

import FogSystemAccessToken from './../models/fogSystemAccessToken';
import BaseManager from './../managers/baseManager';

class FogSystemAccessTokenManager extends BaseManager {

	getEntity() {
		return FogSystemAccessToken;
	}

}

const instance = new FogSystemAccessTokenManager();
export default instance;