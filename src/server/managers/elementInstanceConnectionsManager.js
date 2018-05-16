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

import BaseManager from './../managers/baseManager';
import ElementInstanceConnections from './../models/elementInstanceConnections';

class ElementInstanceConnectionsManager extends BaseManager {

	getEntity() {
		return ElementInstanceConnections;
		}
    
	findBySourceElementInstance(instanceId) {
		return ElementInstanceConnections.findAll({
      where: {
        source_element_instance: instanceId
			}
		});
	}

  findBySourceAndDestinationElementInstance(sourceElementInstanceId, destinationElementInstanceId) {
    return ElementInstanceConnections.findAll({
      where: {
          sourceElementInstance: sourceElementInstanceId,
          destinationElementInstance: destinationElementInstanceId
      }
    });
  }

	deleteElementInstanceConnection(elementId) {
	  return ElementInstanceConnections.destroy({
      where: {
        $or: [{
    			sourceElementInstance: elementId
        }, {
          destinationElementInstance: elementId
        }]
      }
    });
  }
  
  deleteBySourceAndDestinationElementInstance(sourceElementInstanceId, destinationElementInstanceId) {
    return ElementInstanceConnections.destroy({
      where: {
          sourceElementInstance: sourceElementInstanceId,
          destinationElementInstance: destinationElementInstanceId
      }
    });
  }
}

const instance = new ElementInstanceConnectionsManager();
export default instance;
