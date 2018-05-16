/*
 * *******************************************************************************
 *  * Copyright (c) 2018 Edgeworx, Inc.
 *  *
 *  * This program and the accompanying materials are made available under the
 *  * terms of the Eclipse Public License v. 2.0 which is available at
 *  * http://www.eclipse.org/legal/epl-2.0
 *  *
 *  * SPDX-License-Identifier: EPL-2.0
 *  *******************************************************************************
 *
 */

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