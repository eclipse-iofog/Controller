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
 * @file elementInstancePortManager.js
 * @author Zishan Iqbal
 * @description This file includes the CURD operations for the elementInstancePort Model.
 */

import ElementInstancePort from './../models/elementInstancePort';
import BaseManager from './../managers/baseManager';

class ElementInstancePortManager extends BaseManager {
	getEntity() {
		return ElementInstancePort;
	}

	getPortsByElementId(elementId) {
		return ElementInstancePort.findAll({
			where: {
				elementId: elementId
			}
		});
	}

	createElementPort(userId, elementId, portExternal, portInternal) {
		return ElementInstancePort.create({
			portinternal: portInternal,
			portexternal: portExternal,
			updatedBy: userId,
			elementId: elementId
		});
	}

	findPortsByElementIds(ids) {
		return ElementInstancePort.findAll({
			where: {
				elementId: {
					$in: ids
				}
			}
		});
	}

	deleteByElementInstanceId(instanceId) {
		return ElementInstancePort.destroy({
			where: {
				elementId: instanceId
			}
		});
	}

}

const instance = new ElementInstancePortManager();
export default instance;
