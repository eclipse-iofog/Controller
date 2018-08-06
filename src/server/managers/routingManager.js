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
 * @file routingManager.js
 * @author Zishan Iqbal
 * @description This file includes the CURD operations for the routing Model.
 */

const Routing = require('./../models/routing');
const BaseManager = require('./../managers/baseManager');
const sequelize = require('./../utils/sequelize');

class RoutingManager extends BaseManager {

  getEntity() {
      return Routing;
    }
    /**
     * @desc - finds the routings based on the publishsingInstanceId or destinationInstanceId
     * that match with the instanceId
     * @param Integer - instanceId
     * @return JSON - returns a Array of JSON objects of routing
     */
  findByInstanceId(instanceId) {
    return Routing.findAll({
      where: {
        $or: [{
          publishing_instance_id: {
            $eq: instanceId
          }
        }, {
          destination_instance_id: {
            $eq: instanceId
          }
        }]
      }
    });
  }

  isDebugging(uuid, fogInstanceId) {
    return Routing.findAll({
      where: {
        $and:[{
          publishing_instance_id: fogInstanceId,
          destination_instance_id: fogInstanceId,
          publishing_element_id: uuid,
          destination_element_id: 'debug'
        }]
      } 
    });
  }

  isViewer(uuid, fogInstanceId) {
    return Routing.findAll({
      where: {
        $and:[{
          publishing_instance_id: fogInstanceId,
          destination_instance_id: fogInstanceId,
          publishing_element_id: uuid,
          destination_element_id: 'viewer'
        }]
      } 
    });
  }

  findByElementInstanceUuids(uuids) {
    const query = 'select r.*, e.track_id from routing r JOIN element_instance e on e.UUID = r.publishing_element_id where r.publishing_element_id in (:uuids)';
    return sequelize.query(query, {
      replacements: {
        uuids: uuids
      },
      type: sequelize.QueryTypes.SELECT
    });
  }
  findOutputRoutingByElementInstanceUuids(uuids) {
    const query = 'select r.*, e.track_id from routing r JOIN element_instance e on e.UUID = r.destination_element_id where r.destination_element_id in (:uuids)';
    return sequelize.query(query, {
      replacements: {
        uuids: uuids
      },
      type: sequelize.QueryTypes.SELECT
    });
  }

 findByElementInstanceUuidsAndRoutingDestination(uuids) {

    const query = 'select r.*, e.track_id from routing r JOIN element_instance e on e.UUID = r.publishing_element_id where r.destination_element_id in (:uuids)';
    return sequelize.query(query, {
      replacements: {
        uuids: uuids
      },
      type: sequelize.QueryTypes.SELECT
    });
  }
   
  findOutputRoutingByElementInstanceUuidsAndRoutingPublishing(uuids) {
    const query = 'select r.*, e.track_id from routing r JOIN element_instance e on e.UUID = r.destination_element_id where r.publishing_element_id in (:uuids)';
    return sequelize.query(query, {
      replacements: {
        uuids: uuids
      },
      type: sequelize.QueryTypes.SELECT
    });
  }

  deleteByPublishingElementId(elementId) {
    return Routing.destroy({
      where: {
        publishing_element_id: elementId
      }
    });
  }

  deleteByPublishingOrDestinationElementId(elementId) {
    return Routing.destroy({
      where: {
        $or: [{
          publishing_element_id: elementId
        }, {
          destination_element_id: elementId
        }]
      }
    });
  }

  deleteByFogAndElement(instanceId1, instanceId2, elementId1, elementId2, isNetwork) {
    return Routing.destroy({
      where: {
        publishing_instance_id: instanceId1,
        destination_instance_id: instanceId2,
        publishing_element_id: elementId1,
        destination_element_id: elementId2,
        is_network_connection: isNetwork
      }
    });
  }

  deleteByNetworkElementInstanceId(elementId) {
    let deleteQuery = " \
      DELETE FROM routing \
      WHERE publishing_element_id IN( \
        SELECT networkElementId1 \
        FROM network_pairing \
        WHERE elementID1 = ' + elementId + ' \
      ) \
      OR publishing_element_id IN( \
        SELECT networkElementId2 \
        FROM network_pairing \
        WHERE elementID2 = ' + elementId + ' \
      ) \
      OR destination_element_id IN( \
        SELECT networkElementId1 \
        FROM network_pairing \
        WHERE elementID1 = ' + elementId + ' \
      ) \
      OR destination_element_id IN( \
        SELECT networkElementId2 \
        FROM network_pairing \
        WHERE elementID2 = ' + elementId + ' \
      ) \
    ";
    return sequelize.query(deleteQuery);

  }
}

const instance = new RoutingManager();
module.exports =  instance;
