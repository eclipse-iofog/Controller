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
}

const instance = new RoutingManager();
export default instance;