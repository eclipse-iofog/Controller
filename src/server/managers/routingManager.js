/**
 * @file routingManager.js
 * @author Zishan Iqbal
 * @description This file includes the CURD operations for the routing Model.
 */

import Routing from './../models/routing';
import BaseManager from './../managers/baseManager';
import sequelize from './../utils/sequelize';


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
          publishingInstanceId: {
            $eq: instanceId
          }
        }, {
          destinationInstanceId: {
            $eq: instanceId
          }
        }]
      }
    });
  }

  deleteByPublishingElementId(elementId) {
    return Routing.destroy({
      where: {
        publishingElementId: elementId
      }
    });
  }

  deleteByNetworkElementInstanceId(elementId) {
    var deleteQuery = " \
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
export default instance;