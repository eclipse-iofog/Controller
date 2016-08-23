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

	findByInstanceId(instanceId) {
  		return Routing.findAll({
  			where: {
  				$or: [
        {
            publishingInstanceId: 
            {
                $eq: instanceId
            }
        }, 
        {
            destinationInstanceId: 
            {
                $eq: instanceId
            }
        }
          ]
  			}
  		});
	}
}

const instance = new RoutingManager();
export default instance;